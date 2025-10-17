import { TOk, TErr } from './types'

const TENANT_SEGMENT = 'tenant'

export function Ok<T>(value: T): TOk<T> {
  return {
    err: null,
    value
  }
}

export function Err(err: string, errDescription?: string): TErr {
  return { err, errDescription }
}

export function parseLocation(url?: string) {
  const path = url ?? (typeof window !== 'undefined' ? window.location.pathname.toString() : '')
  const segments = path.split('/')
  const tenantPos = segments.indexOf(TENANT_SEGMENT)
  if (tenantPos == -1 || segments.length <= tenantPos) {
    return null
  }
  return {
    locale: segments[tenantPos - 1],
    tenant: segments[tenantPos + 1],
    tenantPos: tenantPos + 1,
    path: '/' + segments.slice(tenantPos + 2).join('/')
  }
}

export function getTenant() {
  return parseLocation()?.tenant ?? ''
}
