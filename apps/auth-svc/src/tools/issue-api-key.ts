import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'

import { genApiKeyPair, genApiKeyPrefix, hashApiKeySecret, composeFullApiKey } from '@jetstyle/server-auth/model'

import { config } from '../config.js'
import { createDbConnection } from '../db.js'
import { TableUsers, TableApiKeys } from '../schema.js'

async function main() {
  const [, , usernameArg] = process.argv
  if (!usernameArg) {
    console.log('Usage: tsx src/tools/issue-api-key.ts <username> [label]')
    process.exit(1)
  }
  const label = process.argv[3]

  const db = createDbConnection(config)

  const users = await db.select().from(TableUsers).where(eq(TableUsers.username, usernameArg)).limit(1)
  const user = users[0]
  if (!user) {
    console.error('User not found by username:', usernameArg)
    process.exit(2)
  }

  // Generate prefix + secret using centralized helpers
  let { prefix, secret } = genApiKeyPair()

  // ensure unique prefix
  for (let i = 0; i < 5; i++) {
    const existing = await db.query.TableApiKeys.findFirst({ where: eq(TableApiKeys.prefix, prefix) })
    if (!existing) { break }
    prefix = genApiKeyPrefix()
  }

  const secretHash = await hashApiKeySecret(secret, config.password.saltRounds)

  const [inserted] = await db.insert(TableApiKeys).values({
    uuid: randomUUID(),
    userId: user.uuid,
    label,
    prefix,
    secretHash,
    status: 'active',
    scopes: user.scopes ?? [],
    tenants: null,
  }).returning()

  if (!inserted) {
    console.error('Failed to insert API key')
    process.exit(3)
  }

  const fullKey = composeFullApiKey(prefix, secret)
  console.log('API key issued for user:', usernameArg)
  console.log('userId:', user.uuid)
  console.log('label:', label ?? '(none)')
  console.log('key:', fullKey)
}

main().catch((e) => {
  console.error('issue-api-key error:', e)
  process.exit(10)
})
