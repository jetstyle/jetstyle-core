import { type KeyLike, jwtVerify, importSPKI } from 'jose'

import { getBasicAuthAccountByLogin, lockBasicAuthAccount, incrementLoginAttempt, resetLoginAttempt } from '@jetstyle/auth-svc'
import { TResult, Ok, Err, arrayIntersection } from '@jetstyle/utils'

import config from './config.js'

export type TAccessTokenPayload = {
  sub: string
  name: string
  iss: string
  aud: string
  tenant?: string
  tpy?: 'tenant-management' | 'customer-tenant'
  email?: string
  username?: string
  scopes: Array<string>
}
export type TAccessToken = TAccessTokenPayload & {
  exp: number
  iat: number
}

export function parseAuthHeader(header: string): string | null {
  const [type, token] = header.split(' ')
  if (type === 'Bearer' && token) {
    return token
  }
  return null
}

export async function verifyAccessToken(
  accessToken: string
): Promise<TResult<TAccessToken>> {
  try {
    const key = await getPublicKey()
    if (!key) {
      return Err('no_public_key')
    }
    const { payload } = await jwtVerify(accessToken, key)
    if (payload.scopes && payload.tenant && payload.name) {
      return Ok(payload as TAccessToken)
    }
    return Err('jwt_wrong_format', JSON.stringify(payload))
  } catch (err: any) {
    console.error('Token verification failed:', err)
    return Err('jwt_verification_failed', err.toString())
  }
}

type KeyCacheRecord = {
  createdAt: number
  key: KeyLike
}
const publicKeysCache = new Map<string, KeyCacheRecord>()
const reqsCache = new Map<string, Promise<KeyLike | null>>()

export async function getPublicKey() {
  const url = config.publicKeyUrl
  const rec = publicKeysCache.get(url)
  const now = Date.now()
  if (rec && now < rec.createdAt + config.publicKeyCacheSeconds * 1000) {
    return rec.key
  }

  const curReq = reqsCache.get(url)
  if (curReq) {
    return curReq
  }

  const request = (async () => {
    try {
      const resp = await fetch(url)
      if (resp.status !== 200) {
        console.log('getPublicKey @ err', url, resp.status, resp.statusText)
        return null
      }
      const publicKeyText = await resp.text()
      const key = await importSPKI(publicKeyText, 'RS256')
      publicKeysCache.set(url, {
        key,
        createdAt: Date.now()
      })
      reqsCache.delete(url)
      return key
    } catch(err) {
      console.log('getPublicKey @ err', err)
      return null
    }
  })()

  return request
}

export type Permission = {
  level: 'denied' | 'allowed' | 'tenant'
  tenant?: string,
  parsedAccessToken?: TAccessToken
}

export async function getPermissions(
  requiredRoles: Array<string>,
  authHeader: string | undefined
): Promise<Permission> {
  if (!authHeader) {
    return {
      level: 'denied'
    }
  }

  const token = parseAuthHeader(authHeader)
  if (!token) {
    return {
      level: 'denied'
    }
  }

  const tokenVerifyResult = await verifyAccessToken(token)
  if (tokenVerifyResult.err !== null) {
    return {
      level: 'denied'
    }
  }

  const parsedToken = tokenVerifyResult.value
  const fullRequiredRoles = config.fullAccessScopes.concat(requiredRoles).filter(Boolean)
  const hasRequiredRoles = arrayIntersection(fullRequiredRoles, parsedToken.scopes)

  console.log('@ parsedToken', parsedToken)
  console.log('@ hasRequiredRoles', hasRequiredRoles)

  if (hasRequiredRoles.length > 0) {
    return {
      level: 'allowed',
      parsedAccessToken: parsedToken
    }
  }

  if (config.tenantBasedPermissions && parsedToken.tenant) {
    return {
      level: 'tenant',
      tenant: parsedToken.tenant,
      parsedAccessToken: parsedToken,
    }
  }

  return {
    level: 'denied'
  }
}

export function getPermissionsByBasicAuth(basicAuthHeader: string): Permission {
  if (!basicAuthHeader) {
    return { level: 'denied' }
  }

  const [type, credentials] = basicAuthHeader.split(' ')
  if (type !== 'Basic' || !credentials) {
    return { level: 'denied' }
  }
  const decoded = Buffer.from(credentials, 'base64').toString('utf-8')
  const [username, password] = decoded.split(':')
  const account = config.fullAccessBasicAccounts.find(
    acc => acc.username === username && acc.password === password
  )
  if (account) {
    return { level: 'allowed' }
  }
  return { level: 'denied' }
}

const MAX_ATTEMPTS = 5

export async function getPermissionsByBasicAuthV2(basicAuthHeader: string): Permission {
  if (!basicAuthHeader) {
    return { level: 'denied' }
  }

  const [type, credentials] = basicAuthHeader.split(' ')
  if (type !== 'Basic' || !credentials) {
    return { level: 'denied' }
  }
  const decoded = Buffer.from(credentials, 'base64').toString('utf-8')
  const [login, password] = decoded.split(':')

  const account = await getBasicAuthAccountByLogin(login)
  if (!account) {
    return { level: 'denied' }
  }
  if (account.status !== 'active') {
    return { level: 'denied' }
  }
  if (account.loginAttempt >= MAX_ATTEMPTS) {
    await lockBasicAuthAccount(account.id)
    return { level: 'denied' }
  }

  const isValidPassword = await authServer.comparePassword(password, account.password)
  if (!isValidPassword) {
    await incrementLoginAttempt(account.uuid, account.loginAttempt)
    return { level: 'denied' }
  }

  await resetLoginAttempt(account.uuid)

  return { level: 'allowed' }
}