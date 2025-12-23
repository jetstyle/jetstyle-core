export type TOk<T> = {
  err: null
  value: T
}

export type TErr = {
  err: string
  errDescription?: string
}

export type TResult<T> = TOk<T> | TErr

export type TListResponse<T> = {
  offset: number
  limit: number
  total: number
  result: Array<T>
}

export type FetchResourceOptions = {
  apiPath: string
  query?: Record<string, string>
  headers?: Record<string, string>
  // Optional custom token getter that returns a full Authorization header value,
  // e.g. "Bearer x.y.z" or "Basic base64"
  getAccessToken?: () => Promise<string | null>
}

export type PostResourceOptions = {
  apiPath: string
  toSubmit: any
  resourceName?: string
  // Optional custom token getter that returns a full Authorization header value,
  // e.g. "Bearer x.y.z" or "Basic base64"
  getAccessToken?: () => Promise<string | null>
}

export type PatchResourceOptions = {
  apiPath: string
  resourceId?: string
  toSubmit: any
  resourceName?: string
  // Optional custom token getter that returns a full Authorization header value,
  // e.g. "Bearer x.y.z" or "Basic base64"
  getAccessToken?: () => Promise<string | null>
}

export type DeleteResourceOptions = {
  apiPath: string
  resourceId?: string
  query?: Record<string, string>
  resourceName?: string
  // Optional custom token getter that returns a full Authorization header value,
  // e.g. "Bearer x.y.z" or "Basic base64"
  getAccessToken?: () => Promise<string | null>
}

export type UploadResourceProgressEvent = {
  loaded: number
  total?: number
  percent?: number
}

export type UploadResourceOptions = {
  apiPath: string
  // should be FormData
  toSubmit: any
  query?: Record<string, string>
  // Optional custom token getter that returns a full Authorization header value,
  // e.g. "Bearer x.y.z" or "Basic base64"
  getAccessToken?: () => Promise<string | null>
  onProgress?: (e: UploadResourceProgressEvent) => void
  signal?: AbortSignal
}

export type AuthParsedToken = {
  // reverse-domain audience
  aud: string

  // reverse-domain issuer
  iss: string

  exp: number
  iat: number

  // user.uuid
  sub: string

  tenant: string
  tpy?: 'tenant-management' | 'customer-tenant'
  name: string
  email?: string
  username?: string

  scopes: Array<string>
}

export type AuthTokens = {
  accessToken: string
  parsedAccessToken: AuthParsedToken
}

export type AuthTokenResponse = {
  accessToken: string
  refreshToken: string
}

export type AuthLoadingState = 'loading' | 'authorized' | 'not-authorized'
