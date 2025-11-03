import { type KeyLike, jwtVerify, importSPKI } from 'jose'

import { TResult, Ok, Err, arrayIntersection } from '@jetstyle/utils'
import bcrypt from 'bcrypt'

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
  tenants?: Record<string, Array<string>>
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
    if (payload.scopes && payload.name && (payload.tenant || payload.tenants)) {
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
  /**
   * @deprecated Use `tenants` instead.
   */
  tenant?: string
  tenants: Array<string>
  parsedAccessToken?: TAccessToken
}

// DB-backed Basic HTTP Auth wiring (host service provides DB accessors; comparePassword is internal here)
export type BasicAuthAccountLite = {
  uuid: string
  login: string
  passwordHash: string | null
  status: 'active' | 'inactive'
  loginAttempts: number
}
type BasicAuthDb = {
  findByLogin(login: string): Promise<BasicAuthAccountLite | null>
  incrementLoginAttempt(uuid: string, attempts: number): Promise<void>
  resetLoginAttempt(uuid: string): Promise<void>
}
let basicAuthDb: BasicAuthDb | null = null
export function setBasicAuthDb(db: BasicAuthDb) {
  basicAuthDb = db
}

export async function getPermissions(
  requiredRoles: Array<string>,
  authHeader: string | undefined
): Promise<Permission> {
  if (!authHeader) {
    return {
      level: 'denied',
      tenants: []
    }
  }

  // Basic HTTP Auth path: if DB accessors wired, validate against DB and use bcrypt compare internally
  const [authType, authCreds] = authHeader.split(' ')
  if (authType === 'Basic' && authCreds && basicAuthDb) {
    try {
      const decoded = Buffer.from(authCreds, 'base64').toString('utf-8')
      const [login, password] = decoded.split(':')
      if (login && password) {
        const account = await basicAuthDb.findByLogin(login)
        const MAX_ATTEMPTS = 5
        if (!account || account.status !== 'active' || account.loginAttempts >= MAX_ATTEMPTS) {
          return { level: 'denied' }
        }
        const ok = await bcrypt.compare(password, account.passwordHash || '')
        if (!ok) {
          await basicAuthDb.incrementLoginAttempt(account.uuid, account.loginAttempts)
          return { level: 'denied' }
        }
        await basicAuthDb.resetLoginAttempt(account.uuid)
        // Treat valid Basic as full access (admin-equivalent)
        return { level: 'allowed' }
      }
    } catch (_e) {
      // fall through to JWT path
    }
    // If Basic was provided but not valid, deny
    return { level: 'denied' }
  }

  const token = parseAuthHeader(authHeader)
  if (!token) {
    return {
      level: 'denied',
      tenants: []
    }
  }

  const tokenVerifyResult = await verifyAccessToken(token)
  if (tokenVerifyResult.err !== null) {
    return {
      level: 'denied',
      tenants: []
    }
  }

  const parsedToken = tokenVerifyResult.value
  const fullRequiredRoles = config.fullAccessScopes.concat(requiredRoles).filter(Boolean)
  const hasRequiredRoles = arrayIntersection(fullRequiredRoles, parsedToken.scopes)
  const tenantsAllowedFromMap = Object.entries(parsedToken.tenants ?? {})
    .filter(([, scopes]) => scopes.includes('edit') || scopes.includes('admin'))
    .map(([tenantName]) => tenantName)
  // Include legacy single-tenant into the unified tenants array for backward compatibility
  const tenantsAllowed = Array.from(new Set([
    ...(parsedToken.tenant ? [parsedToken.tenant] : []),
    ...tenantsAllowedFromMap,
  ]))

  // console.log('@ parsedToken', parsedToken)
  // console.log('@ hasRequiredRoles', hasRequiredRoles)

  if (hasRequiredRoles.length > 0) {
    return {
      level: 'allowed',
      tenants: tenantsAllowed,
      parsedAccessToken: parsedToken
    }
  }

  if (config.tenantBasedPermissions && parsedToken.tenant) {
    return {
      level: 'tenant',
      tenant: parsedToken.tenant,
      tenants: tenantsAllowed,
      parsedAccessToken: parsedToken,
    }
  }

  return {
    level: 'denied',
    tenants: []
  }
}

export function getPermissionsByBasicAuth(basicAuthHeader: string): Permission {
  if (!basicAuthHeader) {
    return { level: 'denied', tenants: [] }
  }

  const [type, credentials] = basicAuthHeader.split(' ')
  if (type !== 'Basic' || !credentials) {
    return { level: 'denied', tenants: [] }
  }
  const decoded = Buffer.from(credentials, 'base64').toString('utf-8')
  const [username, password] = decoded.split(':')
  const account = config.fullAccessBasicAccounts.find(
    acc => acc.username === username && acc.password === password
  )
  if (account) {
    return { level: 'allowed', tenants: [] }
  }
  return { level: 'denied', tenants: [] }
}
