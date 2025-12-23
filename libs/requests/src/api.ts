import { getAccessToken as defaultGetAccessToken } from './auth'
import { dataLayer } from './index'
import type { DeleteResourceOptions, FetchResourceOptions, PatchResourceOptions, PostResourceOptions, TResult, UploadResourceOptions } from './types'
import { Err, Ok, getTenant } from './utils'

function buildUrl(apiPath: string, query: Record<string, any> = {}): string {
  const urlParams = new URLSearchParams(query)
  const tenant = query.tenant ? query.tenant : getTenant()
  if (tenant) {
    urlParams.set('tenant', tenant)
  }

  const qs = urlParams.toString()
  return qs ? `${apiPath}?${qs}` : apiPath
}

export async function fetchResource<T>({
  apiPath,
  query = {},
  getAccessToken,
}: FetchResourceOptions): Promise<TResult<T>> {
  try {
    const url = buildUrl(apiPath, query)

    // Prefer custom getter (returns full header like "Basic ..." or "Bearer ..."),
    // fallback to default (raw access token, we prefix with "Bearer ").
    const customHeader = getAccessToken ? await getAccessToken() : null
    const defaultToken = customHeader ? null : await defaultGetAccessToken()

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(customHeader ? { 'Authorization': customHeader } : {}),
        ...(defaultToken ? { 'Authorization': `Bearer ${defaultToken}` } : {})
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
  resourceName,
  getAccessToken,
}: PostResourceOptions): Promise<TResult<T>> {
  try {
    const url = buildUrl(apiPath)
    const isFormData = toSubmit instanceof FormData

    const customHeader = getAccessToken ? await getAccessToken() : null
    const defaultToken = customHeader ? null : await defaultGetAccessToken()

    const res = await fetch(url, {
      method: 'POST',
      ...(apiPath.includes('auth')) && { credentials: 'include' },
      headers: {
        ...(!isFormData && { 'Content-Type': 'application/json' }),
        ...(customHeader ? { 'Authorization': customHeader } : {}),
        ...(defaultToken ? { 'Authorization': `Bearer ${defaultToken}` } : {})
      },
      body: isFormData ? toSubmit : JSON.stringify(toSubmit),
    })

    const body = await res.json()
    if (res.status === 200 || res.status === 201) {
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
      resourceName,
      getAccessToken,
    } = options

    const path = resourceId
      ? `${apiPath.replace(/\/$/, '')}/${resourceId}`
      : apiPath
    const url = buildUrl(path)

    const customHeader = getAccessToken ? await getAccessToken() : null
    const defaultToken = customHeader ? null : await defaultGetAccessToken()

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(customHeader ? { 'Authorization': customHeader } : {}),
        ...(defaultToken ? { 'Authorization': `Bearer ${defaultToken}` } : {})
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
  resourceName,
  getAccessToken,
}: DeleteResourceOptions): Promise<TResult<T>> {
  try {
    const path = resourceId
      ? `${apiPath.replace(/\/$/, '')}/${resourceId}`
      : apiPath
    const url = buildUrl(path, query)

    const customHeader = getAccessToken ? await getAccessToken() : null
    const defaultToken = customHeader ? null : await defaultGetAccessToken()

    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(customHeader ? { 'Authorization': customHeader } : {}),
        ...(defaultToken ? { 'Authorization': `Bearer ${defaultToken}` } : {})
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

export async function uploadResource<T>({
  apiPath,
  toSubmit,
  query = {},
  getAccessToken,
  onProgress,
  signal,
}: UploadResourceOptions): Promise<TResult<T>> {
  try {
    const url = buildUrl(apiPath, query)
    const isFormData = toSubmit instanceof FormData
    if (!isFormData) {
      return Err('invalid_payload', 'uploadResource expects FormData')
    }

    const customHeader = getAccessToken ? await getAccessToken() : null
    const defaultToken = customHeader ? null : await defaultGetAccessToken()
    const authHeader = customHeader ? customHeader : (defaultToken ? `Bearer ${defaultToken}` : null)

    const res = await new Promise<TResult<T>>((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', url, true)
      xhr.responseType = 'json'
      if (authHeader) {
        xhr.setRequestHeader('Authorization', authHeader)
      }

      const abort = () => {
        try { xhr.abort() } catch { /* noop */ }
      }
      if (signal) {
        if (signal.aborted) {
          abort()
          resolve(Err('aborted'))
          return
        }
        signal.addEventListener('abort', abort, { once: true })
      }

      xhr.upload.onprogress = (evt) => {
        if (!onProgress) {
          return
        }
        const total = typeof evt.total === 'number' && evt.total > 0 ? evt.total : undefined
        const loaded = typeof evt.loaded === 'number' ? evt.loaded : 0
        const percent = total ? (loaded / total) * 100 : undefined
        onProgress({ loaded, total, percent })
      }

      xhr.onerror = () => {
        resolve(Err('request_error'))
      }

      xhr.onabort = () => {
        resolve(Err('aborted'))
      }

      xhr.onload = () => {
        const body = (xhr.response ?? null) as any
        if (xhr.status === 200 || xhr.status === 201) {
          resolve(Ok(body as T))
          return
        }
        if (body && typeof body === 'object' && typeof body.err === 'string') {
          resolve(Err(body.err, body.errDescription))
          return
        }
        const text = (() => {
          try {
            return xhr.responseText
          } catch {
            return ''
          }
        })()
        resolve(Err(`HTTP_${xhr.status}`, text))
      }

      xhr.send(toSubmit)
    })

    return res
  } catch (err: any) {
    console.log('uploadResource @ err', err)
    return Err('request_error', err.toString())
  }
}
