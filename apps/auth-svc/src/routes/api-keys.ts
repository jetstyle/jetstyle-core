import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { genApiKeyPair, genApiKeyPrefix, hashApiKeySecret, composeFullApiKey } from '@jetstyle/server-auth/model'

import {
  ListQueryValidator,
  ListRespValidator,
  ErrRespValidator,
  ErrInsertFailed,
  ErrNotFound,
  ErrForbiddenDescription,
  ErrForbidden,
  crudList,
  crudRead,
  crudDelete,
  crudUpdatePatch,
} from '@jetstyle/hono-drizzle-tools'
import { getPermissions } from '@jetstyle/server-auth'

import { getDbConnection } from '../db.js'
import { config } from '../config.js'
import {
  TableApiKeys,
  ApiKey,
  ApiKeyInsertSchema,
  ApiKeySelectSchema,
  ApiKeyPatchSchema,
} from '../schema.js'

const app = new OpenAPIHono()

function generateApiKeyParts() {
  return genApiKeyPair()
}

async function ensureUniquePrefix(prefix: string): Promise<string> {
  const db = getDbConnection()
  let cur = prefix
  for (let i = 0; i < 5; i++) {
    const found = await db.query.TableApiKeys.findFirst({ where: eq(TableApiKeys.prefix, cur) })
    if (!found) { return cur }
    cur = genApiKeyPrefix()
  }
  return genApiKeyPrefix()
}

export const apiKeysRoutes = app
  .openapi(
    createRoute({
      method: 'get',
      tags: ['API Keys'],
      path: '/',
      request: { query: ListQueryValidator },
      responses: {
        200: {
          description: 'A list of API keys',
          content: {
            'application/json': {
              schema: ListRespValidator.extend({ result: z.array(ApiKeySelectSchema) })
            }
          }
        },
        403: ErrForbiddenDescription,
      }
    }),
    async (c) => {
      const db = getDbConnection()
      const query = c.req.valid('query')

      const authHeader = c.req.header('Authorization')
      const permission = await getPermissions(['api-keys:admin', 'api-keys:read'], authHeader)
      if (permission.level === 'denied') {
        return c.json(ErrForbidden, 403)
      }

      const resp = await crudList<ApiKey>(db, TableApiKeys, query, null, ['secretHash'])
      return c.json(resp, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'get',
      tags: ['API Keys'],
      path: '/{uuid}',
      request: { params: z.object({ uuid: z.string() }) },
      responses: {
        200: { description: 'API key by uuid', content: { 'application/json': { schema: ApiKeySelectSchema } } },
        404: { description: 'Not found', content: { 'application/json': { schema: ErrRespValidator } } },
        403: ErrForbiddenDescription,
      }
    }),
    async (c) => {
      const db = getDbConnection()
      const { uuid } = c.req.valid('param')

      const authHeader = c.req.header('Authorization')
      const permission = await getPermissions(['api-keys:admin', 'api-keys:read'], authHeader)
      if (permission.level === 'denied') {
        return c.json(ErrForbidden, 403)
      }

      const res = await crudRead<ApiKey>(db, TableApiKeys, uuid, ['secretHash'])
      if (res) {
        return c.json(res, 200)
      }
      return c.json(ErrNotFound, 404)
    }
  )
  .openapi(
    createRoute({
      method: 'post',
      tags: ['API Keys'],
      path: '/',
      request: {
        body: { content: { 'application/json': { schema: ApiKeyInsertSchema.extend({ userId: z.string() }) } } }
      },
      responses: {
        200: {
          description: 'Created API key',
          content: {
            'application/json': {
              schema: ApiKeySelectSchema.extend({ issuedKey: z.string().optional() })
            }
          }
        },
        403: ErrForbiddenDescription,
        500: { description: 'Failed', content: { 'application/json': { schema: ErrRespValidator } } }
      }
    }),
    async (c) => {
      const db = getDbConnection()
      const body = c.req.valid('json') as z.infer<typeof ApiKeyInsertSchema> & { userId: string }

      const authHeader = c.req.header('Authorization')
      const permission = await getPermissions(['api-keys:admin'], authHeader)
      if (permission.level === 'denied') {
        return c.json(ErrForbidden, 403)
      }

      const initial = generateApiKeyParts()
      const prefix = await ensureUniquePrefix(initial.prefix)
      const secret = initial.secret
      const secretHash = await hashApiKeySecret(secret, config.password.saltRounds)

      try {
        const inserted = await db.insert(TableApiKeys).values({
          uuid: randomUUID(),
          userId: body.userId,
          label: (body as any).label,
          prefix,
          secretHash,
          status: (body as any).status ?? 'active',
          scopes: (body as any).scopes ?? [],
          tenants: (body as any).tenants ?? null,
        }).returning()

        const record = inserted[0]
        if (!record) {
          return c.json(ErrInsertFailed, 500)
        }
        const safe: any = { ...record }
        delete safe.secretHash
        safe.issuedKey = composeFullApiKey(prefix, secret)
        return c.json(safe, 200)
      } catch (e) {
        return c.json(ErrInsertFailed, 500)
      }
    }
  )
  .openapi(
    createRoute({
      method: 'patch',
      tags: ['API Keys'],
      path: '/{uuid}',
      request: {
        params: z.object({ uuid: z.string() }),
        body: { content: { 'application/json': { schema: ApiKeyPatchSchema } } }
      },
      responses: {
        200: { description: 'Updated', content: { 'application/json': { schema: ApiKeySelectSchema } } },
        404: { description: 'Not found' },
        403: ErrForbiddenDescription,
      }
    }),
    async (c) => {
      const db = getDbConnection()
      const { uuid } = c.req.valid('param')
      const body = c.req.valid('json')

      const authHeader = c.req.header('Authorization')
      const permission = await getPermissions(['api-keys:admin'], authHeader)
      if (permission.level === 'denied') {
        return c.json(ErrForbidden, 403)
      }

      const res = await crudUpdatePatch<ApiKey, typeof body>(db, TableApiKeys, uuid, body)
      if (res) {
        return c.json(res, 200)
      }
      return c.json(ErrNotFound, 404)
    }
  )
  .openapi(
    createRoute({
      method: 'delete',
      tags: ['API Keys'],
      path: '/{uuid}',
      request: { params: z.object({ uuid: z.string() }) },
      responses: {
        200: { description: 'Deleted', content: { 'application/json': { schema: z.object({ uuid: z.string() }) } } },
        403: ErrForbiddenDescription,
      }
    }),
    async (c) => {
      const db = getDbConnection()
      const { uuid } = c.req.valid('param')

      const authHeader = c.req.header('Authorization')
      const permission = await getPermissions(['api-keys:admin'], authHeader)
      if (permission.level === 'denied') {
        return c.json(ErrForbidden, 403)
      }

      await crudDelete(db, TableApiKeys, uuid)
      return c.json({ uuid }, 200)
    }
  )

export default app
