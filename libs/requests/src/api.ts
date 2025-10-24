import type { FetchResourceOptions, PostResourceOptions, PatchResourceOptions, DeleteResourceOptions, TResult } from './types'
import { getTenant } from './utils'
import { Ok, Err } from './utils'
import { getAccessToken } from './auth'
import { dataLayer } from './index'

function buildUrl(apiPath: string, query: Record<string, any> = {}): string {
  const urlParams = new URLSearchParams(query)
  const tenant = query.tenant ? query.tenant : getTenant()
  if (tenant) urlParams.set('tenant', tenant)

  const qs = urlParams.toString()
  return qs ? `${apiPath}?${qs}` : apiPath
}

export async function fetchResource<T>({
  apiPath,
  query = {},
}: FetchResourceOptions): Promise<TResult<T>> {
  try {
    const token = await getAccessToken()
    const url = buildUrl(apiPath, query)

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...token && { 'Authorization': `Bearer ${token}` }
      }
    })

    const body = await res.json()
    if (res.status === 200) {
      const result = body as T
      return Ok(result)
    }
    if (body.err) {
      return Err(body.err, body.errDescription)
    }
    return Err('request_error', JSON.stringify(body))
  } catch (err: any) {
    console.log('fetchResource @ err', err)
    return Err('request_error', err.toString())
  }
}

export async function postResource<T>({
  apiPath,
  toSubmit = {},
  resourceName
}: PostResourceOptions): Promise<TResult<T>> {
  try {
    const token = await getAccessToken()
    const url = buildUrl(apiPath)
    const isFormData = toSubmit instanceof FormData

    const res = await fetch(url, {
      method: 'POST',
      ...(apiPath.includes('auth')) && { credentials: 'include' },
      headers: {
        ...(!isFormData && { 'Content-Type': 'application/json' }),
        ...token && { 'Authorization': `Bearer ${token}` }
      },
      body: isFormData ? toSubmit : JSON.stringify(toSubmit),
    })

    const body = await res.json()
    if (res.status === 200) {
      const result = body as T
      if (resourceName) {
        dataLayer.writeEntity(resourceName, result)
        dataLayer.invalidateType(resourceName)
      }

      return Ok(result)
    }
    if (body.err) {
      return Err(body.err, body.errDescription)
    }
    return Err('request_error', JSON.stringify(body))
  } catch (err: any) {
    console.log('postResource @ err', err)
    return Err('request_error', err.toString())
  }
}

export async function patchResource<T>(options: PatchResourceOptions): Promise<TResult<T>> {
  try {
    const {
      apiPath,
      resourceId,
      toSubmit,
      resourceName
    } = options

    const path = resourceId
      ? `${apiPath.replace(/\/$/, '')}/${resourceId}`
      : apiPath
    const url = buildUrl(path)

    const token = await getAccessToken()
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...token && { 'Authorization': `Bearer ${token}` }
      },
      body: JSON.stringify(toSubmit),
    })

    const body = await res.json()
    if (res.status === 200) {
      const result = body as T
      if (resourceName) {
        dataLayer.writeEntity(resourceName, result)
        dataLayer.invalidateType(resourceName)
      }
      return Ok(result)
    }
    if (body.err) {
      return Err(body.err, body.errDescription)
    }
    return Err('request_error', JSON.stringify(body))
  } catch (err: any) {
    console.log('patchResource @ err', err)
    return Err('request_error', err.toString())
  }
}

export async function deleteResource<T>({
  apiPath,
  resourceId,
  query = {},
  resourceName
}: DeleteResourceOptions): Promise<TResult<T>> {
  try {
    const path = resourceId
      ? `${apiPath.replace(/\/$/, '')}/${resourceId}`
      : apiPath
    const url = buildUrl(path, query)

    const token = await getAccessToken()

    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...token && { 'Authorization': `Bearer ${token}` }
      },
    })
    const body = await res.json()
    if (res.status === 200) {
      if (resourceName && resourceId) {
        dataLayer.invalidateId(resourceName, resourceId)
        dataLayer.invalidateType(resourceName)
      }
      return Ok(body as T)
    }
    if (body.err) {
      return Err(body.err, body.errDescription)
    }
    return Err('request_error', JSON.stringify(body))
  } catch (err: any) {
    console.log('deleteResource @ err', err)
    return Err('request_error', err.toString())
  }
}
