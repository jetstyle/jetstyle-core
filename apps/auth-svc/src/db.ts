import path from 'path'

import { drizzle } from 'drizzle-orm/postgres-js'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

import * as schema from './schema.js'
import type { AuthServerConfig } from './types.js'

export type DB = PostgresJsDatabase<typeof schema>

function getConnectionStr(config: AuthServerConfig) {
  return `postgres://${config.db.username}:${config.db.password}@${config.db.host}:${config.db.port}/${config.db.database}`
}

export async function applyMigrations(config: AuthServerConfig) {
  const connectionStr = getConnectionStr(config)
  const migrationClient = postgres(connectionStr, { max: 1, ssl: (config.db.ssl as unknown as any) })
  const migrationsFolder = path.resolve(config.db.migrationsFolder)

  console.log('auth @ migrationFolder', migrationsFolder)

  await migrate(
    drizzle(migrationClient, { schema }),
    {
      migrationsFolder: migrationsFolder,
      migrationsSchema: 'drizzle_auth_svc',
    }
  )
}

let GLOBAL_CONNECTION: DB | undefined

export function createDbConnection(config: AuthServerConfig): DB {
  const connectionStr = getConnectionStr(config)
  try {
    const queryClient = postgres(connectionStr, { ssl: (config.db.ssl as unknown as any) })
    const db = drizzle(queryClient, { schema })
    GLOBAL_CONNECTION = db
    console.log('Database connected successfully')
    return db
  } catch (error) {
    console.error('Database connection error:', error)
    throw error
  }
}

export function getDbConnection(): DB {
  if (!GLOBAL_CONNECTION) {
    throw new Error('GLOBAL_CONNECTION not initialized')
  }
  return GLOBAL_CONNECTION
}

// TODO:
// export function getDbConnection(tenant: string): DB {
//
// }
