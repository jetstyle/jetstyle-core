import { drizzle } from 'drizzle-orm/postgres-js'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from './schema.js'
import type { TaskTrackerConfig } from './config.js'

let GLOBAL_CONNECTION: PostgresJsDatabase<typeof schema> | undefined

function getConnectionStr(config: TaskTrackerConfig) {
  const { username, password, host, port, database } = config.db
  return `postgres://${username}:${password}@${host}:${port}/${database}`
}

export async function applyMigrations(config: TaskTrackerConfig) {
  const connectionStr = getConnectionStr(config)
  const migrationClient = postgres(connectionStr, { max: 1 })
  await migrate(
    drizzle(migrationClient, { schema }),
    {
      migrationsFolder: config.db.migrationsFolder,
      migrationsSchema: 'drizzle_task_tracker',
    }
  )
}

export function createDbConnection(config: TaskTrackerConfig) {
  if (!GLOBAL_CONNECTION) {
    const connectionStr = getConnectionStr(config)
    const queryClient = postgres(connectionStr)
    GLOBAL_CONNECTION = drizzle(queryClient, { schema })
    console.log('Task tracker DB connected')
  }
  return GLOBAL_CONNECTION
}

export function getDbConnection() {
  if (!GLOBAL_CONNECTION) {
    throw new Error('GLOBAL_CONNECTION not initialized')
  }
  return GLOBAL_CONNECTION
}