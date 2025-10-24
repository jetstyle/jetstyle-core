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
}

export type PostResourceOptions = {
  apiPath: string
  toSubmit: any
  resourceName?: string
}

export type PatchResourceOptions = {
  apiPath: string
  resourceId?: string
  toSubmit: any
  resourceName?: string
}

export type DeleteResourceOptions = {
  apiPath: string
  resourceId?: string
  query?: Record<string, string>
  resourceName?: string
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
