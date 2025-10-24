import type { AuthTokens, AuthParsedToken, AuthTokenResponse, TResult, TErr } from './types'
import { Err, Ok } from './utils'
import jwt from 'jsonwebtoken'

let TOKENS: AuthTokens | null = null
let REFRESH_TOKEN: string | null = null
const REFRESH_TOKEN_KEY = 'refreshToken'

let tokenReqCache: Promise<AuthTokens | null> | null = null

export function setRefreshToken(refreshToken: string) {
  REFRESH_TOKEN = refreshToken
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function isExpired(jwt: AuthParsedToken) {
  return (Date.now() > jwt.exp * 1000 - 10 * 1000)
}

export function parseJWT(token: string) {
  return jwt.decode(token)
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

async function fetchAccessToken(refreshToken: string): Promise<TResult<AuthTokens>> {
  try {
    // refreshToken is in the http-only cookie
    const res = await fetch('/auth/core/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // for cookies
      body: JSON.stringify({
        refreshToken,
      })
    })

    const data = await res.json()
    if (res.status === 200) {
      const accessToken = (data as AuthTokenResponse).accessToken
      return setAccessToken(accessToken)
    } else {
      const errData = data as TErr
      return Err(errData.err, errData.errDescription)
    }
  } catch(e: any) {
    return Err('unknown_error', e.toString())
  }
}

export async function getTokens(): Promise<AuthTokens | null> {
  if (tokenReqCache) {
    return tokenReqCache
  }

  if (!REFRESH_TOKEN) {
    const tryRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (tryRefreshToken) {
      REFRESH_TOKEN = tryRefreshToken
    }
  }

  if (!REFRESH_TOKEN) {
    return null
  }

  if (TOKENS) {
    if (!isExpired(TOKENS.parsedAccessToken)) {
      return TOKENS
    } else {
      console.log('getTokens: TOKENS EXPIRED')
    }
  }

  tokenReqCache = (async () => {
    console.log('getTokens: fetch started')
    const res = await fetchAccessToken(REFRESH_TOKEN)

    tokenReqCache = null
    if (res.err !== null) {
      console.log('getAccessToken @ err', res)

      REFRESH_TOKEN = null
      localStorage.setItem(REFRESH_TOKEN_KEY, '')
      return null
    }

    return res.value
  })()

  return tokenReqCache
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = await getTokens()

  return tokens?.accessToken ?? null
}