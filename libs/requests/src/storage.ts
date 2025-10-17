// Lightweight Svelte-like stores for React with per-resource pub/sub, byId + collections, and optional polling
// ----------------------------------------------------------------------------------
// Features
// - Normalized entity cache per resource type
// - Subscribe to a single entity (type+id) or to a collection/query (type+params)
// - Stale-while-revalidate; de-duped in-flight requests
// - Optional polling per subscription; polling auto-stops when last subscriber leaves
// - Tiny API; no external deps beyond React
// - Works with useSyncExternalStore to avoid tearing and extra renders
// ----------------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react'
import { TResult } from './types'

export type ID = string

function now() { return Date.now() }

function stableStringify(value: any): string {
  const seen = new WeakSet()
  const stringify = (v: any): any => {
    if (v && typeof v === 'object') {
      if (seen.has(v)) return '[Circular]'
      seen.add(v)
      if (Array.isArray(v)) return v.map(stringify)
      const keys = Object.keys(v).sort()
      const out: Record<string, any> = {}
      for (const k of keys) out[k] = stringify(v[k])
      return out
    }
    return v
  }
  return JSON.stringify(stringify(value))
}

class Emitter {
  private listeners = new Map<string, Set<() => void>>()
  subscribe(key: string, cb: () => void): () => void {
    let set = this.listeners.get(key)
    if (!set) { set = new Set(); this.listeners.set(key, set) }
    set.add(cb)
    return () => {
      if (set) {
        set.delete(cb)
        if (set.size === 0) this.listeners.delete(key)
      }
    }
  }
  emit(key: string) {
    const set = this.listeners.get(key)
    if (!set) return
    for (const cb of [...set]) { try { cb() } catch (e) {
      // ignore
    } }
  }
  count(key: string) { return this.listeners.get(key)?.size ?? 0 }
}

type EntityMap<T> = Map<ID, { value: T; updatedAt: number }>

// eslint-disable-next-line
type QueryEntry<T> = {
  ids: Array<ID>
  updatedAt: number
  err?: string | null
  initialLoading: boolean
  refreshing: boolean
  paramsKey: string
}

type ResourceConfig<T, P> = {
  fetchById?: (id: ID) => Promise<TResult<T>>
  fetchList?: (params: P) => Promise<TResult<Array<T>>>
  idOf?: (t: T) => ID
  staleTime?: number
}

type AnyResourceConfig = ResourceConfig<any, any>
type RegisteredResources = Map<string, AnyResourceConfig>

export function createDataLayer() {
  const emitter = new Emitter()

  const resources: RegisteredResources = new Map()
  const entities = new Map<string, EntityMap<any>>()
  const queries = new Map<string, Map<string, QueryEntry<any>>>()
  const inflight = new Map<string, Promise<any>>()
  const pollers = new Map<string, ReturnType<typeof setInterval>>()

  const TYPE_KEY = (type: string) => `${type}`
  const ID_KEY = (type: string, id: ID) => `${type}:${String(id)}`
  const QUERY_KEY = (type: string, paramsKey: string) => `query:${type}:${paramsKey}`
  const INF_ID_KEY = (type: string, id: ID) => `${type}|id|${String(id)}`
  const INF_Q_KEY = (type: string, paramsKey: string) => `${type}|q|${paramsKey}`

  function ensureEntityMap(type: string) {
    if (!entities.has(type)) entities.set(type, new Map())
    return entities.get(type)!
  }
  function ensureQueryMap(type: string) {
    if (!queries.has(type)) queries.set(type, new Map())
    return queries.get(type)!
  }

  function register<T, P = any>(type: string, cfg: ResourceConfig<T, P>) {
    resources.set(type, cfg as AnyResourceConfig)
    ensureEntityMap(type)
    ensureQueryMap(type)
  }

  function getIdOf<T>(type: string, item: T): ID {
    const idOf = resources.get(type)?.idOf
    return idOf ? idOf(item) : (item as any).uuid
  }

  function upsertEntity<T>(type: string, item: T) {
    const id = getIdOf(type, item)
    const map = ensureEntityMap(type)
    map.set(id, { value: item, updatedAt: now() })
    emitter.emit(ID_KEY(type, id))
    emitter.emit(TYPE_KEY(type))
  }

  function setEntities<T>(type: string, items: Array<T>) {
    for (const it of items) upsertEntity(type, it)
  }

  function updateQuery<T>(type: string, paramsKey: string, items: Array<T>) {
    const qmap = ensureQueryMap(type)
    const ids = items.map(it => getIdOf(type, it))
    const entry: QueryEntry<T> = {
      ids,
      updatedAt: now(),
      initialLoading: false,
      refreshing: false,
      paramsKey,
      err: null,
    }
    qmap.set(paramsKey, entry)
    emitter.emit(QUERY_KEY(type, paramsKey))
  }

  function getEntity<T>(type: string, id: ID) {
    return ensureEntityMap(type).get(id)?.value as T | undefined
  }

  function getQueryResult<T>(type: string, paramsKey: string): { items: Array<T>; initialLoading: boolean; refreshing: boolean; err?: string | null } {
    const q = ensureQueryMap(type).get(paramsKey)
    if (!q) return { items: [], initialLoading: false, refreshing: false, err: null }
    const map = ensureEntityMap(type)
    const items = q.ids.map(id => map.get(id)?.value).filter(Boolean) as Array<T>
    return { items, initialLoading: q.initialLoading, refreshing: q.refreshing, err: q.err }
  }

  function markQueryStart(type: string, paramsKey: string) {
    const qmap = ensureQueryMap(type)
    const q = qmap.get(paramsKey) ?? ({ ids: [], updatedAt: 0, initialLoading: false, refreshing: false, paramsKey, err: null } as QueryEntry<any>)
    const hasItems = q.ids.length > 0
    q.initialLoading = !hasItems
    q.refreshing = hasItems
    q.err = null
    qmap.set(paramsKey, q)
    emitter.emit(QUERY_KEY(type, paramsKey))
  }

  function setQueryError(type: string, paramsKey: string, err: string | null) {
    const qmap = ensureQueryMap(type)
    const q = qmap.get(paramsKey) ?? ({ ids: [], updatedAt: 0, initialLoading: false, refreshing: false, paramsKey, err: null } as QueryEntry<any>)
    q.initialLoading = false
    q.refreshing = false
    q.err = err
    qmap.set(paramsKey, q)
    emitter.emit(QUERY_KEY(type, paramsKey))
  }

  // -----------------------------
  // Fetch orchestration (de-duped)
  // -----------------------------

  async function fetchById<T>(type: string, id: ID) {
    const cfg = resources.get(type)
    if (!cfg?.fetchById) throw new Error(`fetchById not configured for ${type}`)
    const key = INF_ID_KEY(type, id)
    if (inflight.has(key)) return inflight.get(key)!
    const p = cfg.fetchById(id)
      .then(res => {
        if (res.err == null) {
          upsertEntity<T>(type, res.value)
        }
        // No cache update on error
        return res
      })
      .finally(() => inflight.delete(key))
    inflight.set(key, p)
    return p
  }

  async function fetchList<T, P>(type: string, params: P) {
    const cfg = resources.get(type)
    if (!cfg?.fetchList) throw new Error(`fetchList not configured for ${type}`)
    const paramsKey = stableStringify(params)
    const key = INF_Q_KEY(type, paramsKey)
    if (inflight.has(key)) return inflight.get(key)!
    markQueryStart(type, paramsKey)
    const p = cfg.fetchList(params as any)
      .then(res => {
        if (res.err == null) {
          setEntities<T>(type, res.value)
          updateQuery<T>(type, paramsKey, res.value)
        } else {
          setQueryError(type, paramsKey, res.err)
        }
        return res
      })
      .catch(err => {
        setQueryError(type, paramsKey, err?.toString?.() ?? 'Unknown error')
        return { err: err?.toString?.() ?? 'Unknown error' }
      })
      .finally(() => inflight.delete(key))
    inflight.set(key, p)
    return p
  }

  function invalidateType(type: string) {
    const qmap = ensureQueryMap(type)
    for (const q of qmap.values()) q.updatedAt = 0
    emitter.emit(TYPE_KEY(type))
  }
  function invalidateId(type: string, id: ID) {
    const map = ensureEntityMap(type)
    const e = map.get(id); if (e) e.updatedAt = 0
    emitter.emit(ID_KEY(type, id))
  }
  function invalidateQuery(type: string, params: any) {
    const key = stableStringify(params)
    const q = ensureQueryMap(type).get(key); if (q) q.updatedAt = 0
    emitter.emit(QUERY_KEY(type, key))
  }

  type UseResourceOpts = { staleTime?: number; fetch?: boolean; poll?: number }
  type UseCollectionOpts = { staleTime?: number; fetch?: boolean; poll?: number }

  function useResource<T>(type: string, id: ID, opts: UseResourceOpts = {}) {
    const key = ID_KEY(type, id)
    const cfg = resources.get(type)
    const staleTime = opts.staleTime ?? cfg?.staleTime ?? 0

    const getSnapshot = () => {
      const value = getEntity<T>(type, id)
      const updatedAt = entities.get(type)?.get(id)?.updatedAt ?? 0
      return { value, updatedAt }
    }

    const [snap, setSnap] = useState(getSnapshot)

    useEffect(() => {
      const unsubscribe = emitter.subscribe(key, () => setSnap(getSnapshot()))
      setSnap(getSnapshot())
      return unsubscribe
    }, [type, id])

    useEffect(() => {
      const shouldFetch = opts.fetch !== false && (!snap.value || (now() - snap.updatedAt > staleTime))
      if (shouldFetch && cfg?.fetchById) fetchById<T>(type, id)
    }, [type, id, staleTime, cfg?.fetchById, snap.value, snap.updatedAt])

    useEffect(() => {
      if (!opts.poll) return
      const pollKey = INF_ID_KEY(type, id)
      if (!pollers.has(pollKey) && emitter.count(key) > 0) {
        const intv = setInterval(() => { fetchById<T>(type, id) }, opts.poll)
        pollers.set(pollKey, intv)
      }
      return () => {
        const intv = pollers.get(pollKey)
        if (intv && emitter.count(key) === 0) { clearInterval(intv); pollers.delete(pollKey) }
      }
    }, [type, id, opts.poll])

    const refetch = () => fetchById<T>(type, id)

    // For single entity, we don't track err in cache, so always err: null
    return { value: snap.value as T | undefined, loading: !snap.value, err: null, refetch }
  }

  function useCollection<T, P = any>(type: string, params: P, opts: UseCollectionOpts = {}) {
    const paramsKey = useMemo(() => stableStringify(params), [params])
    const qKey = QUERY_KEY(type, paramsKey)
    const cfg = resources.get(type)
    const staleTime = opts.staleTime ?? cfg?.staleTime ?? 0

    const getSnapshot = () => {
      const { items, initialLoading, refreshing, err } = getQueryResult<T>(type, paramsKey)
      const updatedAt = queries.get(type)?.get(paramsKey)?.updatedAt ?? 0
      return { items, initialLoading, refreshing, err, updatedAt }
    }

    const [snap, setSnap] = useState(getSnapshot)

    useEffect(() => {
      const unsubscribe = emitter.subscribe(qKey, () => setSnap(getSnapshot()))
      setSnap(getSnapshot())
      return unsubscribe
    }, [type, paramsKey])

    useEffect(() => {
      const shouldFetch = opts.fetch !== false && !snap.err && (snap.updatedAt === 0 || (now() - snap.updatedAt > staleTime))
      if (shouldFetch && cfg?.fetchList) fetchList<T, P>(type, params)
    }, [type, paramsKey, staleTime, cfg?.fetchList, snap.items, snap.updatedAt])

    useEffect(() => {
      if (!opts.poll) return
      const pollKey = INF_Q_KEY(type, paramsKey)
      if (!pollers.has(pollKey) && emitter.count(qKey) > 0) {
        const intv = setInterval(() => { fetchList<T, P>(type, params) }, opts.poll)
        pollers.set(pollKey, intv)
      }
      return () => {
        const intv = pollers.get(pollKey)
        if (intv && emitter.count(qKey) === 0) { clearInterval(intv); pollers.delete(pollKey) }
      }
    }, [type, paramsKey, opts.poll])

    const refetch = () => fetchList<T, P>(type, params)

    return { value: snap.items as Array<T>, loading: snap.initialLoading, refreshing: snap.refreshing, err: snap.err, refetch }
  }

  function writeEntity<T>(type: string, item: T) { upsertEntity<T>(type, item) }
  function removeEntity(type: string, id: ID) {
    const map = ensureEntityMap(type)
    if (map.delete(id)) {
      emitter.emit(ID_KEY(type, id))
      emitter.emit(TYPE_KEY(type))
      const qmap = ensureQueryMap(type)
      for (const q of qmap.values()) {
        const before = q.ids.length
        q.ids = q.ids.filter(i => i !== id)
        if (q.ids.length !== before) emitter.emit(QUERY_KEY(type, q.paramsKey))
      }
    }
  }

  return {
    register,
    useResource,
    useCollection,
    fetchById,
    fetchList,
    getEntity,
    writeEntity,
    removeEntity,
    invalidateType,
    invalidateId,
    invalidateQuery,
  }
}
