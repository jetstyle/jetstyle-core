import { serve } from '@hono/node-server'
import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'

import { sleep } from '@jetstyle/utils'

import { config } from './config.js'
import { applyMigrations, createDbConnection } from './db.js'
import { AuthServer } from './model.js'
import {
  authRoutes,
  codesRoutes,
  tenantsRoutes,
  usersRoutes,
  basicAuthAccountsRoutes,
  contactsApp,
  permissionBindsApp,
  apiKeysRoutes,
} from './routes/index.js'
import defaultSeedFunc from './seed.js'
import { Buffer } from 'buffer'
import { generateKeyPairSync, randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { TableAuthKeys } from './schema.js'
import type { DB } from './db.js'
import type { AuthServerConfig, EmailSender, SMSSender } from './types.js'

declare module 'hono' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface ContextVariableMap {
    authServer: AuthServer
  }
}

async function ensureKeys(db: DB, cfg: AuthServerConfig) {
  // If ENV provided, use them as-is
  if (cfg.privateKey && cfg.publicKey) {
    console.log('[auth-svc] JWT keys provided via ENV')
    return
  }

  // Try to load from DB (stored as base64-encoded PEM per tools/keys.ts)
  const tenantName = cfg.adminTenant ?? 'platform'
  const rows = await db.select()
    .from(TableAuthKeys)
    .where(eq(TableAuthKeys.tenant, tenantName))

  const priv = rows.find(r => r.keyType === 'private')
  const pub = rows.find(r => r.keyType === 'public')

  if (priv?.value && pub?.value) {
    cfg.privateKey = priv.value
    cfg.publicKey = pub.value
    console.log('[auth-svc] JWT keys loaded from DB')
    return
  }

  // Generate new RSA keypair and persist to DB
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  const privateKeyBase64 = Buffer.from(privateKey, 'utf8').toString('base64')
  const publicKeyBase64 = Buffer.from(publicKey, 'utf8').toString('base64')

  await db.insert(TableAuthKeys).values([
    {
      uuid: randomUUID().toString(),
      tenant: tenantName,
      keyType: 'private' as const,
      value: privateKeyBase64,
    },
    {
      uuid: randomUUID().toString(),
      tenant: tenantName,
      keyType: 'public' as const,
      value: publicKeyBase64,
    },
  ])

  cfg.privateKey = privateKeyBase64
  cfg.publicKey = publicKeyBase64
  console.log('[auth-svc] JWT keys generated and stored in DB')
}

async function startServer(authServer: AuthServer) {
  const app = new OpenAPIHono()

  const authServerMiddleware = createMiddleware(async (c, next) => {
    c.set('authServer', authServer)
    await next()
  })

  console.log('[auth init] config.authSvcSelfUrl', config.authSvcSelfUrl)

  app.use(cors({
    origin: config.authSvcSelfUrl,
    credentials: true,
  }))
    .use(authServerMiddleware)
    .get('/mu', (c) => c.json({ hru: 1 }))
    .route('/auth/core', authRoutes)
    .route('/auth/codes', codesRoutes)
    .route('/auth/users', usersRoutes)
    .route('/auth/tenants', tenantsRoutes)
    .route('/auth/permission-binds', permissionBindsApp)
    .route('/auth/contacts', contactsApp)
    .route('/auth/basic-auth-accounts', basicAuthAccountsRoutes)
    .route('/auth/api-keys', apiKeysRoutes)
    .get('/auth/swagger', swaggerUI({ url: '/auth/doc' }))

  app.doc('/auth/doc', {
    info: {
      title: 'An API',
      version: 'v1'
    },
    openapi: '3.1.0'
  })

  serve({
    port: authServer.config.port,
    fetch: app.fetch,
  })

  console.log('Listen on', authServer.config.port)
}

export type AuthSvcOptions = {
  seedFunc?: (authServer: AuthServer) => void
  emailSender?: EmailSender
  smsSender?: SMSSender
}

export async function main(options?: AuthSvcOptions) {
  await sleep(2000)

  console.log('Starting')

  await applyMigrations(config)
  console.log('Migrations: ok')

  const db = createDbConnection(config)
  console.log('DB connection: ok')

  await ensureKeys(db, config)
  console.log('JWT keys ready')

  process.on('uncaughtException', (err) => {
    console.log('uncaughtException', err.toString())
  })

  const authServer = new AuthServer(db, config, options?.smsSender, options?.emailSender)
  startServer(authServer)

  console.log('Started')

  await defaultSeedFunc(authServer)
  if (options?.seedFunc) {
    await options.seedFunc(authServer)
  }
}
