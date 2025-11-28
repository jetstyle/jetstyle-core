import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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

function resolveSslOpt(sslEnv: unknown): any | undefined {
  if (sslEnv == null) {
    return undefined
  }
  const v = String(sslEnv).trim().toLowerCase()
  if (v === '' || v === 'disable' || v === 'false' || v === '0' || v === 'off' || v === 'none') {
    return undefined
  }
  if (v === 'require' || v === 'true' || v === '1' || v === 'on') {
    return 'require'
  }
  return sslEnv as any
}

function resolveMigrationsFolder(config: AuthServerConfig) {
  // 1) Explicit ENV override (kept for backward compatibility); relative to CWD by design
  const override = process.env.AUTH_SVC__MIGRATIONS
  if (override && override.trim().length > 0) {
    const envResolved = path.resolve(override)
    if (fs.existsSync(envResolved) && fs.statSync(envResolved).isDirectory()) {
      return envResolved
    }
  }

  // 2) Config override if provided: prefer path relative to this file location (ESM-safe), then absolute, then CWD
  const cfgPath = config.db.migrationsFolder
  const fileDir = path.dirname(fileURLToPath(import.meta.url))
  if (cfgPath && cfgPath.trim().length > 0) {
    const byFileDir = path.resolve(fileDir, cfgPath)
    if (fs.existsSync(byFileDir) && fs.statSync(byFileDir).isDirectory()) {
      return byFileDir
    }
    if (path.isAbsolute(cfgPath) && fs.existsSync(cfgPath) && fs.statSync(cfgPath).isDirectory()) {
      return cfgPath
    }
    const byCwd = path.resolve(cfgPath)
    if (fs.existsSync(byCwd) && fs.statSync(byCwd).isDirectory()) {
      return byCwd
    }
  }

  // 3) Auto-detect by walking up from the current file (robust for dist/src, submodules, different CWDs)
  let dir = fileDir
  const maxLevels = 8
  for (let i = 0; i < maxLevels; i++) {
    const candidate = path.join(dir, 'drizzle')
    if (fs.existsSync(candidate)) {
      const stat = fs.statSync(candidate)
      if (stat.isDirectory()) {
        return candidate
      }
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      break
    }
    dir = parent
  }

  // 4) Extra fallbacks for common layouts
  const fallbackCandidates = [
    path.resolve(fileDir, '../drizzle'),
    path.resolve(fileDir, '../../drizzle'),
    path.resolve(fileDir, '../../../drizzle'),
  ]
  for (const c of fallbackCandidates) {
    if (fs.existsSync(c) && fs.statSync(c).isDirectory()) {
      return c
    }
  }

  throw new Error('[auth-svc] Unable to locate migrations folder "drizzle" starting from ' + fileDir)
}

export async function applyMigrations(config: AuthServerConfig) {
  const connectionStr = getConnectionStr(config)
  const migrationClient = postgres(connectionStr, { max: 1, ssl: resolveSslOpt(config.db.ssl) })
  const migrationsFolder = resolveMigrationsFolder(config)

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
    const queryClient = postgres(connectionStr, { ssl: resolveSslOpt(config.db.ssl) })
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
