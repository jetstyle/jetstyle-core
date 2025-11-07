import { eq } from 'drizzle-orm'

import type { DB } from './types.js'
import { TableBasicAuthAccounts } from './schema.js'

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
