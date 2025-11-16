import { eq } from 'drizzle-orm'

import { TableBasicAuthAccounts, TableApiKeys, TableUsers } from './schema.js'
import type { DB } from './types.js'

export * from './model/api-keys.js'

export type BasicAuthAccountLite = {
  uuid: string
  login: string
  passwordHash: string | null
  status: 'active' | 'inactive'
  loginAttempts: number
}

export async function findBasicAuthAccountByLogin<T extends DB>(
  db: T,
  login: string
): Promise<BasicAuthAccountLite | null> {
  const rows = await db
    .select()
    .from(TableBasicAuthAccounts)
    .where(eq(TableBasicAuthAccounts.login, login))
    .limit(1)

  const acc = rows[0]
  if (!acc) {
    return null
  }

  return {
    uuid: acc.uuid,
    login: acc.login,
    passwordHash: acc.passwordHash ?? null,
    status: acc.status as 'active' | 'inactive',
    loginAttempts: acc.loginAttempts ?? 0
  }
}

export async function incrementLoginAttempt<T extends DB>(
  db: T,
  uuid: string,
  attempts: number
): Promise<void> {
  await db
    .update(TableBasicAuthAccounts)
    .set({ loginAttempts: (attempts ?? 0) + 1 })
    .where(eq(TableBasicAuthAccounts.uuid, uuid))
}

export async function resetLoginAttempt<T extends DB>(
  db: T,
  uuid: string
): Promise<void> {
  await db
    .update(TableBasicAuthAccounts)
    .set({
      loginAttempts: 0,
      lastLoginAt: new Date()
    })
    .where(eq(TableBasicAuthAccounts.uuid, uuid))
}

// ---------------- API Keys helpers ----------------
export type ApiKeyLite = {
  uuid: string
  userId: string
  prefix: string
  secretHash: string
  status: 'active' | 'inactive'
  scopes: Array<string> | null
  tenants: { list: Array<string> } | null
}

export async function findApiKeyByPrefix<T extends DB>(db: T, prefix: string): Promise<ApiKeyLite | null> {
  const rows = await db
    .select()
    .from(TableApiKeys)
    .where(eq(TableApiKeys.prefix, prefix))
    .limit(1)

  const rec = rows[0]
  if (!rec) {
    return null
  }
  return {
    uuid: rec.uuid,
    userId: rec.userId,
    prefix: rec.prefix,
    secretHash: rec.secretHash,
    status: rec.status as 'active' | 'inactive',
    scopes: (rec.scopes as unknown as Array<string>) ?? null,
    tenants: (rec.tenants as unknown as { list: Array<string> } | null) ?? null,
  }
}

export async function markApiKeyUsed<T extends DB>(db: T, uuid: string): Promise<void> {
  await db
    .update(TableApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(TableApiKeys.uuid, uuid))
}

export type UserLite = { uuid: string; tenant: string; scopes: Array<string> }
export async function findUserByUuid<T extends DB>(db: T, uuid: string): Promise<UserLite | null> {
  const rows = await db
    .select()
    .from(TableUsers)
    .where(eq(TableUsers.uuid, uuid))
    .limit(1)

  const rec = rows[0]
  if (!rec) {
    return null
  }
  return {
    uuid: rec.uuid,
    tenant: rec.tenant,
    scopes: (rec.scopes as unknown as Array<string>) ?? []
  }
}
