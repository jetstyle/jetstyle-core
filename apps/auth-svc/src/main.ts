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
  permissionBindsApp
} from './routes/index.js'
import defaultSeedFunc from './seed.js'

declare module 'hono' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface ContextVariableMap {
    authServer: AuthServer
  }
}

async function startServer(authServer: AuthServer) {
  const app = new OpenAPIHono()

  const authServerMiddleware = createMiddleware(async (c, next) => {
    c.set('authServer', authServer)
    await next()
  })

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
  seedFunc: (authServer: AuthServer) => void
}

export async function main(options?: AuthSvcOptions) {
  await sleep(2000)

  console.log('Starting')

  await applyMigrations(config)
  console.log('Migrations: ok')

  const db = createDbConnection(config)
  console.log('DB connection: ok')

  process.on('uncaughtException', (err) => {
    console.log('uncaughtException', err.toString())
  })

  const authServer = new AuthServer(db, config)
  startServer(authServer)

  console.log('Started')

  await defaultSeedFunc(authServer)
  if (options?.seedFunc) {
    await options.seedFunc(authServer)
  }
}
