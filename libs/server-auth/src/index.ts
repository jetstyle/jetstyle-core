import bcrypt from 'bcrypt'
import { type KeyLike, jwtVerify, importSPKI } from 'jose'

import { TResult, Ok, Err, arrayIntersection } from '@jetstyle/utils'
import config from './config.js'
import type { DB } from './types.js'
import { findBasicAuthAccountByLogin, incrementLoginAttempt, resetLoginAttempt, findApiKeyByPrefix, markApiKeyUsed, findUserByUuid } from './model.js'
import { splitFullApiKey, verifyApiKeySecret } from './model/api-keys.js'

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

export async function getPermissions<T extends DB>(
  requiredRoles: Array<string>,
  authHeader: string | undefined,
  db?: T
): Promise<Permission> {
  if (!authHeader) {
    return {
      level: 'denied',
      tenants: []
    }
  }

  // Basic HTTP Auth path: if DB accessors wired, validate against DB and use bcrypt compare internally
  const [authType, authCreds] = (authHeader ?? '').split(' ')
  if (authType === 'Basic' && authCreds && db) {
    try {
      const decoded = Buffer.from(authCreds, 'base64').toString('utf-8')
      const [login, password] = decoded.split(':')
      if (login && password) {
        const account = await findBasicAuthAccountByLogin(db, login)
        const MAX_ATTEMPTS = 5
        if (!account || account.status !== 'active' || account.loginAttempts >= MAX_ATTEMPTS) {
          return { level: 'denied', tenants: [] }
        }
        const ok = await bcrypt.compare(password, account.passwordHash || '')
        if (!ok) {
          await incrementLoginAttempt(db, account.uuid, account.loginAttempts)
          return { level: 'denied', tenants: [] }
        }
        await resetLoginAttempt(db, account.uuid)
        // Treat valid Basic as full access (admin-equivalent)
        return { level: 'allowed', tenants: [] }
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      // fall through to JWT path
    }
    // If Basic was provided but not valid, deny
    return { level: 'denied', tenants: [] }
  }

  // API Key path: Authorization: ApiKey <key>
  let apiKeyHeader: string | undefined
  if (authHeader) {
    const [type, token] = authHeader.split(' ')
    if (type === 'ApiKey' && token) { apiKeyHeader = token }
  }

  if (apiKeyHeader && db) {
    const keyText = apiKeyHeader.trim()
    const parts = splitFullApiKey(keyText)
    if (parts) {
      const { prefix, secret } = parts
      const keyRec = await findApiKeyByPrefix(db, prefix)
      if (keyRec && keyRec.status === 'active') {
        const ok = await verifyApiKeySecret(secret, keyRec.secretHash)
        if (ok) {
          await markApiKeyUsed(db, keyRec.uuid)
          const user = await findUserByUuid(db, keyRec.userId)
          if (!user) {
            return { level: 'denied', tenants: [] }
          }
          const effectiveScopes = (keyRec.scopes && keyRec.scopes.length > 0)
            ? keyRec.scopes
            : user.scopes

          const fullRequiredRoles = config.fullAccessScopes.concat(requiredRoles).filter(Boolean)
          const hasRequiredRoles = arrayIntersection(fullRequiredRoles, effectiveScopes)

          const tenantsAllowed = Array.from(new Set([
            ...(keyRec.tenants?.list ?? []),
            user.tenant,
          ].filter(Boolean)))

          if (hasRequiredRoles.length > 0) {
            return { level: 'allowed', tenants: tenantsAllowed }
          }

          return { level: 'denied', tenants: tenantsAllowed }
        }
      }
    }
    // fallthrough to JWT if API key invalid
  }

  const token = authHeader ? parseAuthHeader(authHeader) : null
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
