import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'

import {
  crudCreate,
  crudDelete,
  crudList,
  crudRead,
  crudUpdatePatch,
  ErrForbidden,
  ErrForbiddenDescription,
  ErrInsertFailed,
  ErrNotFound,
  ListQueryValidator,
  ListRespValidator
} from '@jetstyle/hono-drizzle-tools'
import { getPermissions } from '@jetstyle/server-auth'

import { getDbConnection } from '../db.js'
import {
  TableBasicAuthAccounts,
  BasicAuthAccountInsertSchema,
  BasicAuthAccountUpdateSchema,
  BasicAuthAccountSelectSchema,
  BasicAuthAccount,
} from '../schema.js'

const app = new OpenAPIHono()

export const basicAuthAccountsRoutes = app.openapi(
  createRoute({
    method: 'get',
    tags: ['Basic auth accounts'],
    path: '/',
    request: {
      query: ListQueryValidator
    },
    responses: {
      200: {
        description: 'A list of basic auth accounts',
        content: {
          'application/json': {
            schema: ListRespValidator.extend({
              result: z.array(BasicAuthAccountSelectSchema),
            })
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
    const permission = await getPermissions([], authHeader)

    if (permission.level === 'denied') {
      return c.json(ErrForbidden, 403)
    }
    if (permission.tenant) {
      if (query.tenant && query.tenant !== permission.tenant) {
        return c.json(ErrForbidden, 403)
      }
      query.tenant = permission.tenant
    }

    const resp = await crudList<BasicAuthAccount>(db, TableBasicAuthAccounts, query, null, ['passwordHash'])
    return c.json(resp, 200)
  }
)
  .openapi(
    createRoute({
      method: 'get',
      path: '/{uuid}',
      tags: ['Basic auth accounts'],
      request: {
        params: z.object({ uuid: z.string().uuid() })
      },
      responses: {
        200: {
          description: 'Account found',
          content: {
            'application/json': { schema: BasicAuthAccountSelectSchema }
          }
        },
        403: ErrForbiddenDescription,
        404: { description: 'Not found' }
      }
    }),
    async (c) => {
      const db = getDbConnection()
      const { uuid } = c.req.valid('param')

      const authHeader = c.req.header('Authorization')
      const permission = await getPermissions([], authHeader)

      if (permission.level === 'denied') {
        return c.json(ErrForbidden, 403)
      }

      const res = await crudRead<BasicAuthAccount>(db, TableBasicAuthAccounts, uuid, ['passwordHash'])
      if (res) {
        return c.json(res, 200)
      }
      return c.json(ErrNotFound, 404)
    }
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/',
      tags: ['Basic auth accounts'],
      request: {
        body: {
          content: {
            'application/json': {
              schema: BasicAuthAccountInsertSchema
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Account created',
          content: {
            'application/json': { schema: BasicAuthAccountSelectSchema }
          }
        },
        403: ErrForbiddenDescription,
        409: { description: 'Login already taken' }
      }
    }),
    async (c) => {
      const db = getDbConnection()
      const authServer = c.get('authServer')
      const body = c.req.valid('json')

      const authHeader = c.req.header('Authorization')
      const permission = await getPermissions([], authHeader)

      if (permission.level === 'denied') {
        return c.json(ErrForbidden, 403)
      }

      const existing = await db.query.TableBasicAuthAccounts.findFirst({
        where: eq(TableBasicAuthAccounts.login, body.login)
      })
      if (existing) {
        return c.json({ error: 'Login already taken' }, 409)
      }

      const hashedPasswd = await authServer.hashPassword(body.password)
      if (hashedPasswd.err !== null) {
        return c.json(hashedPasswd, 500)
      }

      const prepared = {
        ...body,
        password: undefined,
        passwordHash: hashedPasswd.value
      }
      delete prepared.password

      const res = await crudCreate<BasicAuthAccount, typeof prepared>(db, TableBasicAuthAccounts, prepared)
      if (res) {
        const safeResponse = { ...res } as Partial<BasicAuthAccount>
        delete safeResponse.passwordHash
        return c.json(safeResponse, 201)
      }
      return c.json(ErrInsertFailed, 500)
    }
  )
  .openapi(
    createRoute({
      method: 'patch',
      path: '/{uuid}',
      tags: ['Basic auth accounts'],
      request: {
        params: z.object({ uuid: z.string().uuid() }),
        body: {
          content: {
            'application/json': {
              schema: BasicAuthAccountUpdateSchema
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Updated account',
          content: {
            'application/json': { schema: BasicAuthAccountSelectSchema }
          }
        },
        403: ErrForbiddenDescription,
        404: { description: 'Not found' },
        409: { description: 'Login already taken' }
      }
    }),
    async (c) => {
      const db = getDbConnection()
      const { uuid } = c.req.valid('param')
      const body = c.req.valid('json')

      const authHeader = c.req.header('Authorization')
      const permission = await getPermissions([], authHeader)

      if (permission.level === 'denied') {
        return c.json(ErrForbidden, 403)
      }

      const existing = await db.query.TableBasicAuthAccounts.findFirst({
        where: eq(TableBasicAuthAccounts.uuid, uuid)
      })
      if (!existing) {
        return c.json({ error: 'Not found' }, 404)
      }

      if (body.login && body.login !== existing.login) {
        const taken = await db.query.TableBasicAuthAccounts.findFirst({
          where: eq(TableBasicAuthAccounts.login, body.login)
        })
        if (taken) {
          return c.json({ error: 'Login already taken' }, 409)
        }
      }

      const res = await crudUpdatePatch<BasicAuthAccount, typeof body>(db, TableBasicAuthAccounts, uuid, body)
      return c.json(res, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'delete',
      path: '/{uuid}',
      tags: ['Basic auth accounts'],
      request: {
        params: z.object({ uuid: z.string().uuid() })
      },
      responses: {
        200: {
          description: 'Deleted account info',
          content: {
            'application/json': {
              schema: z.object({
                uuid: z.string()
              })
            }
          }
        },
        403: ErrForbiddenDescription,
      }
    }),
    async (c) => {
      const db = getDbConnection()
      const { uuid } = c.req.valid('param')

      const authHeader = c.req.header('Authorization')
      const permission = await getPermissions([], authHeader)

      if (permission.level === 'denied') {
        return c.json(ErrForbidden, 403)
      }

      await crudDelete(db, TableBasicAuthAccounts, uuid)
      return c.json({ uuid }, 200)
    }
  )
