import jwt from 'jsonwebtoken'

import { TResult, Ok, Err } from '@jetstyle/utils'

import { fetchConfig } from '../helpers/api'
import type { AuthParsedToken } from '../types/types'

export type AuthTokenResponse = {
  accessToken: string
  refreshToken: string
}

type ErrResp = {
  err: string
  errDescription: string | undefined
}

export type AuthLoadingState = 'loading' | 'authorized' | 'not-authorized'

export type AuthTokens = {
  accessToken: string
  parsedAccessToken: AuthParsedToken
}

let TOKENS: AuthTokens | null = null
let REFRESH_TOKEN: string | null = null
const REFRESH_TOKEN_KEY = 'refreshToken'

async function getUrls() {
  const config = await fetchConfig()
  const authSvc = config?.globalConfig?.serviceLookup?.auth
  const urls = {
    redirectUrl: `${config?.globalConfig?.selfRoot}/login/return`,
    authTokenUrl: `${authSvc}/core/token`,
    authSvcAuthUrl: `${authSvc}/auth`,
    authLogout: `${authSvc}/core/logout`
    // authTokenRevokeUrl: `${authSvc}/core/token`,
  }
  return urls
}

async function fetchAccessToken(refreshToken: string): Promise<TResult<AuthTokens>> {
  try {
    const urls = await getUrls()

    // refreshToken is in the http-only cookie
    const res = await fetch(urls.authTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // headers: {
      //   'Content-Type': 'application/x-www-form-urlencoded',
      // },
      credentials: 'include', // for cookies
      body: JSON.stringify({
        refreshToken,
      })
    })

    const data = await res.json()
    if (res.status === 200) {
      const accessToken = (data as AuthTokenResponse).accessToken
      return setAccessToken(accessToken)
      // const parsedAccessToken = parseJWT(accessToken)
      // if (parsedAccessToken === null || typeof parsedAccessToken === 'string') {
      //   return Err('token_parse_error')
      // }
      // const tokens = {
      //   accessToken,
      //   parsedAccessToken: parsedAccessToken as AuthParsedToken
      // }
      // TOKENS = tokens
      // return Ok(tokens)
    } else {
      const errData = data as ErrResp
      return Err(errData.err, errData.errDescription)
    }
  } catch(e: any) {
    return Err('unknown_error', e.toString())
  }
}

export function setAccessToken(accessToken: string): TResult<AuthTokens> {
  const parsedAccessToken = parseJWT(accessToken)
  if (parsedAccessToken === null || typeof parsedAccessToken === 'string') {
    return Err('token_parse_error')
  }
  const tokens = {
    accessToken,
    parsedAccessToken: parsedAccessToken as AuthParsedToken
  }
  console.log('tokens: set')
  TOKENS = tokens
  return Ok(tokens)
}

export function setRefreshToken(refreshToken: string) {
  REFRESH_TOKEN = refreshToken
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function parseJWT(token: string) {
  return jwt.decode(token)
}

export function getRefreshToken(): string | null {
  if (REFRESH_TOKEN) {
    return REFRESH_TOKEN
  }
  return null
}

let tokenReqCache: Promise<AuthTokens | null> | null = null
export async function getTokens(): Promise<AuthTokens | null> {
  // console.log('getTokens: start')
  if (tokenReqCache) {
    // console.log('getTokens: has req cache')
    return tokenReqCache
  }

  if (!REFRESH_TOKEN) {
    const tryRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (tryRefreshToken) {
      REFRESH_TOKEN = tryRefreshToken
    }
  }

  if (!REFRESH_TOKEN) {
    // console.log('getTokens: clear cache no refresh token')
    // tokenReqCache = null
    return null
  }

  if (TOKENS) {
    // console.log('getTokens: has TOKENS')
    if (!isExpired(TOKENS.parsedAccessToken)) {
      return TOKENS
    } else {
      console.log('getTokens: TOKENS EXPIRED')
    }
  }

  // console.log('getTokens: create req cache')
  tokenReqCache = (async () => {
    console.log('getTokens: fetch started')
    const res = await fetchAccessToken(REFRESH_TOKEN)
    // console.log('getTokens: fetch ended, clear cache')
    tokenReqCache = null
    if (res.err !== null) {
      console.log('getAccessToken @ err', res)

      REFRESH_TOKEN = null
      localStorage.setItem(REFRESH_TOKEN_KEY, '')
      return null
    }

    return res.value
  })()

  // console.log('getTokens: create req cache created')

  return tokenReqCache
}

export async function getAccessToken(): Promise<string | null> {
  // console.trace('getAccessToken @ trace')

  const tokens = await getTokens()

  // console.trace('getAccessToken @ tokens', tokens)

  return tokens?.accessToken ?? null
}

export function isExpired(jwt: AuthParsedToken) {
  return (Date.now() > jwt.exp * 1000 - 10 * 1000)
}

// Logout
export async function revokeRefreshToken() {
  const refreshToken = REFRESH_TOKEN

  REFRESH_TOKEN = null
  TOKENS = null
  console.log('tokens: clear')
  localStorage.setItem(REFRESH_TOKEN_KEY, '')

  const urls = await getUrls()
  const response = await fetch(urls.authLogout, {
    method: 'POST',
    // headers: {
    //   'Content-Type': 'application/x-www-form-urlencoded',
    // },
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...refreshToken && { body: JSON.stringify({ refreshToken }) }
  })

  const data = await response.json()

  return data
}
