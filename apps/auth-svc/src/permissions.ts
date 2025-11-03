import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'

import type { Permission, TAccessToken } from '@jetstyle/server-auth'
import { parseAuthHeader, verifyAccessToken } from '@jetstyle/server-auth'
import { arrayIntersection } from '@jetstyle/utils'

import { getDbConnection } from './db.js'
import { TableBasicAuthAccounts } from './schema.js'

/**
 * Try to authenticate using HTTP Basic credentials from Authorization header.
 * - Decodes base64(login:password)
 * - Finds account by login in DB
 * - Checks account.status === 'active'
 * - Compares password with bcrypt hash
 * Returns true when valid, otherwise false.
 */
async function isValidBasicAuth(authHeader: string | undefined): Promise<boolean> {
  if (!authHeader) {
    return false
  }
  const [type, base64] = authHeader.split(' ')
  if (type !== 'Basic' || !base64) {
    return false
  }

  const decoded = Buffer.from(base64, 'base64').toString('utf-8')
  const [login, password] = decoded.split(':')
  if (!login || !password) {
    return false
  }

  const db = getDbConnection()
  const account = await db.query.TableBasicAuthAccounts.findFirst({
    where: eq(TableBasicAuthAccounts.login, login),
  })

  if (!account || account.status !== 'active') {
    return false
  }
  const ok = await bcrypt.compare(password, account.passwordHash || '')
  return ok
}

export async function getPermissions(
  requiredRoles: Array<string>,
  authHeader: string | undefined
): Promise<Permission> {
  if (!authHeader) {
    return { level: 'denied' }
  }

  // 1) Basic HTTP Auth: treat as admin if credentials are valid in DB
  if (await isValidBasicAuth(authHeader)) {
    return { level: 'allowed' }
  }

  // 2) Bearer JWT path (reuse shared verification helpers)
  const token = parseAuthHeader(authHeader)
  if (!token) {
    return { level: 'denied' }
  }

  const tokenVerifyResult = await verifyAccessToken(token)
  if (tokenVerifyResult.err !== null) {
    return { level: 'denied' }
  }

  const parsedToken = tokenVerifyResult.value as TAccessToken
  // full access scopes include admin
  const fullRequiredRoles = ['admin', ...requiredRoles].filter(Boolean)
  const hasRequiredRoles = arrayIntersection(fullRequiredRoles, parsedToken.scopes)

  if (hasRequiredRoles.length > 0) {
    return {
      level: 'allowed',
      parsedAccessToken: parsedToken
    }
  }

  // Optionally, support tenant-level behavior if needed later
  return { level: 'denied' }
}
