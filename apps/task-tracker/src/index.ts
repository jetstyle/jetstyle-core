import { serve } from '@hono/node-server'
import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'

import { sleep } from '@jetstyle/utils'

import { config } from './config.js'
import { applyMigrations, createDbConnection } from './db.js'
import { tasksApp } from './routes/tasks.js'

async function main() {
  await sleep(2000)
  await applyMigrations(config)
  createDbConnection(config)
  const app = new OpenAPIHono()
  app.use(cors())
  // ...existing code...
  app.route('/task-tracker/tasks', tasksApp)
  app.get(
    '/swagger',
    swaggerUI({
      url: '/doc'
    })
  )
  app.doc('/doc', {
    info: {
      title: 'Task Tracker API',
      version: 'v1',
    },
    openapi: '3.1.0'
  })
  serve({ port: config.port, fetch: app.fetch })
  console.log('Task tracker listening on', config.port)
}

main()