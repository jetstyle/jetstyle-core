import superagent from 'superagent'
import { mutate } from 'swr'

import { getAccessToken } from '../helpers/auth'
import type { Resource, APIResourceProps } from '../types/types'
import { type TResult, Ok, Err } from '@jetstyle/utils'
import { getTenant } from './nav'

const CONFIG_PATH = process.env.NEXT_PUBLIC_CONFIG_PATH

let configFetcher: any = null
export async function fetchConfig() {
  if (!configFetcher) {
    const configPath = CONFIG_PATH ? CONFIG_PATH : '/config'
    configFetcher = fetch(configPath).then((res) => res.json())
  }
  return configFetcher
}

async function buildGenericResourcePath({ apiService, apiPath, resourceId }) {
  const config = await fetchConfig()
  const apiHost = config?.globalConfig?.serviceLookup?.[apiService] ?? ''
  let patchUrl = apiPath
  if (patchUrl[patchUrl.length - 1] !== '/') {
    patchUrl += '/'
  }
  patchUrl += resourceId

  let url = apiHost + patchUrl
  const tenant = getTenant()
  if (tenant) {
    url = url + `?tenant=${tenant}`
  }
  return url
}

const resourceCache = new Map<string, Promise<TResult<Resource>>>()

export async function fetchResourceById<T>({
  apiService,
  apiPath,
  uuid = '',
}: APIResourceProps): Promise<TResult<T>> {
  const cacheKey = `${apiService}_${apiPath}_${uuid}`
  const req = resourceCache.get(cacheKey)
  if (req) {
    return (req as Promise<TResult<T>>)
  }

  const request = (async () => {
    try {
      const config = await fetchConfig()
      const apiHost = config?.globalConfig?.serviceLookup?.[apiService] ?? ''
      const accessToken = await getAccessToken()
      let url = `${apiHost}${apiPath}`
      if (uuid) {
        url += `/${uuid}`
      }
      const tenant = getTenant()
      if (tenant) {
        url = url + `?tenant=${tenant}`
      }
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...accessToken && { 'Authorization': `Bearer ${accessToken}` }
        }
      })
      const body = await res.json()
      if (res.status === 200) {
        const result: Resource = body
        return Ok(result)
      }
      if (body.err) {
        return Err(body.err, body.errDescription)
      }
      return Err('request_error', JSON.stringify(body))
    } catch(e: any) {
      // TODO: handle 403

      console.log('fetchResourceById @ err', e)
      return Err('request_error', e.toString())
    }
  })()

  resourceCache.set(cacheKey, request)
  return (request as Promise<TResult<T>>)
}

type FetchResourceOptions = {
  apiService: string
  apiPath: string
  query?: Record<string, string>
}

export async function fetchResource<T>({
  apiService,
  apiPath,
  query = {}
}: FetchResourceOptions): Promise<TResult<T>> {
  try {
    const config = await fetchConfig()
    const apiHost = config?.globalConfig?.serviceLookup?.[apiService] ?? ''
    const token = await getAccessToken()
    const tenant = getTenant()
    let url = new URL(apiHost + apiPath)

    const urlParams = new URLSearchParams(query)

    if (tenant) {
      urlParams.set('tenant', tenant)
    }

    url.search = urlParams.toString()

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
  } catch(err: any) {
    console.log('fetchResource @ err', err)
    return Err('request_error', err.toString())
  }
}

export async function postResource<T>({
  apiService,
  apiPath,
  toSubmit = {},
}): Promise<TResult<T>> {
  try {
    const config = await fetchConfig()
    const apiHost = config?.globalConfig?.serviceLookup?.[apiService] ?? ''
    const token = await getAccessToken()
    const tenant = getTenant()
    let url = new URL(apiHost + apiPath)

    const urlParams = new URLSearchParams(url.search)

    if (tenant) {
      urlParams.set('tenant', tenant)
    }

    url.search = urlParams.toString()

    const res = await fetch(url, {
      method: 'POST',
      ...(apiService === 'auth') && { credentials: 'include' },
      headers: {
        'Content-Type': 'application/json',
        ...token && { 'Authorization': `Bearer ${token}` }
      },
      body: JSON.stringify(toSubmit),
    })
    const body = await res.json()
    if (res.status === 200) {
      // console.log('postResource:mutate', apiPath, body)
      mutate(apiPath)
      return Ok(body as T)
    }
    if (body.err) {
      return Err(body.err, body.errDescription)
    }
    return Err('request_error', JSON.stringify(body))
  } catch(err: any) {
    console.log('postResource @ err', err)
    return Err('request_error', err.toString())
  }
}

type PatchResourceOptions = {
  apiService?: string
  apiPath?: string
  resourceId?: string
  toSubmit: any
}

export async function patchResource<T>(options: PatchResourceOptions): Promise<TResult<T>> {
  try {
    const {
      apiService,
      apiPath,
      resourceId,
      toSubmit,
    } = options

    let url: string
    if (resourceId) {
      url = await buildGenericResourcePath({ apiService, apiPath, resourceId })
    } else {
      const config = await fetchConfig()
      const apiHost = apiService ? (config?.globalConfig?.serviceLookup?.[apiService] ?? '') : ''
      const tenant = getTenant()
      url = apiHost + apiPath
      if (tenant) {
        url = url + `?tenant=${tenant}`
      }
    }

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
      mutate(apiPath, toSubmit)
      return Ok(body as T)
    }
    if (body.err) {
      return Err(body.err, body.errDescription)
    }
    return Err('request_error', JSON.stringify(body))
  } catch(err: any) {
    console.log('patchResource @ err', err)
    return Err('request_error', err.toString())
  }

}

export async function deleteResource<T>({
  apiService,
  apiPath,
  resourceId
}): Promise<TResult<T>> {
  try {
    const patchUrl = await buildGenericResourcePath({ apiService, apiPath, resourceId })
    const token = await getAccessToken()
    const res = await fetch(patchUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...token && { 'Authorization': `Bearer ${token}` }
      },
    })
    const body = await res.json()
    if (res.status === 200) {
      mutate(apiPath)
      return Ok(body as T)
    }
    if (body.err) {
      return Err(body.err, body.errDescription)
    }
    return Err('request_error', JSON.stringify(body))
  } catch(err: any) {
    console.log('deleteResource @ err', err)
    return Err('request_error', err.toString())
  }
}

type UploadFileOptions = {
  apiService: string
  apiPath: string
  file: any
  toSubmit: Record<string, any>
  onProgress?: any
}

export async function uploadFile(options: UploadFileOptions) {
  const {
    apiService,
    apiPath,
    file,
    toSubmit,
    onProgress,
  } = options
  const config = await fetchConfig()
  const token = await getAccessToken()
  const apiHost = config?.globalConfig?.serviceLookup?.[apiService] ?? ''

  const tenant = getTenant()
  let url = apiHost + apiPath
  if (tenant) {
    url = url + `?tenant=${tenant}`
  }
  const req =  superagent.post(url)
    .attach('file', file)
    .on('progress', (event) => {
    /* the event is:
    {
      direction: "upload" or "download"
      percent: 0 to 100 // may be missing if file size is unknown
      total: // total file size, may be missing
      loaded: // bytes downloaded or uploaded so far
    } */

      if (onProgress) {
        onProgress(event)
      }
    })

  if (token) {
    req.set('Authorization', `Bearer ${token}`)
  }

  for (const prop in toSubmit) {
    req.field(prop, toSubmit[prop])
  }

  const resp = await req
  return resp.body
}

export async function fetchResourceList<T>({
  apiService,
  apiPath,
  queryParams
}) {
  const { limit, offset } = queryParams
  try {
    const config = await fetchConfig()
    const token = await getAccessToken()
    const apiHost = config?.globalConfig?.serviceLookup?.[apiService] ?? ''
    const params = new URLSearchParams()
    params.append('limit', limit )
    params.append('offset', offset )

    const tenant = getTenant()
    if (tenant) {
      params.append('tenant', tenant)
    }

    const queryString = params.toString()
    let url = new URL(`${apiHost}${apiPath}?${queryString}`)
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...token && { 'Authorization': `Bearer ${token}` }
      }
    })
    const body = await res.json()
    if (res.status === 200) {
      return Ok(body as T)
    }
    if (body.err) {
      return Err(body.err, body.errDescription)
    }
    return Err('request_error', JSON.stringify(body))
  } catch(err: any) {
    console.log('fetchResource @ err', err)
    return Err('request_error', err.toString())
  }
}
