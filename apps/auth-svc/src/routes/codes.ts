import { randomBytes } from 'node:crypto'

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

import {
  ListQueryValidator,
  ListRespValidator,
  ErrInsertFailed,
  ErrRespValidator,
  ErrNotFound,
  ErrForbiddenDescription,
  ErrForbidden,
  crudList,
  crudRead,
  crudCreate,
  crudDelete,
  crudUpdatePatch,
} from '@jetstyle/hono-drizzle-tools'
import { getPermissions } from '@jetstyle/server-auth'

import { getDbConnection } from '../db.js'
import { AuthCode, AuthCodeInsertSchema, AuthCodeSelectSchema, TableAuthCodes } from '../schema.js'
import { config } from '../config.js'

const app = new OpenAPIHono()

export const codesRoutes = app.openapi(
  createRoute({
    method: 'get',
    tags: ['AuthCodes'],
    path: '/',
    request: {
      query: ListQueryValidator
    },
    responses: {
      200: {
        description: 'A list of AuthCodes',
        content: {
          'application/json': {
            schema: ListRespValidator.extend({
              result: z.array(AuthCodeSelectSchema),
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
    const permission = await getPermissions(['users:admin', 'users:read'], authHeader)

    if (permission.level === 'denied') {
      return c.json(ErrForbidden, 403)
    }
    if (permission.tenant) {
      if (query.tenant && query.tenant !== permission.tenant) {
        return c.json(ErrForbidden, 403)
      }
      query.tenant = permission.tenant
    }

    const resp = await crudList<AuthCode>(db, TableAuthCodes, query)
    return c.json(resp, 200)
  }
)
  // TODO - remove after creating the set-code endpoint ??
  .openapi(
    createRoute({
      method: 'post',
      tags: ['AuthCodes'],
      path: '/',
      request: {
        body: {
          description: 'Issue a new AuthCode',
          content: {
            'application/json': {
              schema: z.object({ userId: z.string() })
            }
          }
        },
      },
      responses: {
        200: {
          description: 'A new AuthCode',
          content: {
            'application/json': {
              schema: AuthCodeSelectSchema
            }
          }
        },
        404: {
          description: 'User not found',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
        500: {
          description: 'Failed to create a new AuthCode',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        }
      }
    }),
    async (c) => {
      const data = c.req.valid('json')
      const authServer = c.get('authServer')
      const user = await authServer.getUserById(data.userId)
      if (!user) {
        return c.json({
          err: 'user_not_found',
          errDescription: 'User with provided userId was not found',
        }, 404)
      }

      const { codeLiveTime , codeBondTime } = config
      const authCode = randomBytes(6).toString('base64url').slice(0, 6)
      const body = { userId: user.uuid, code: authCode, liveTime: codeLiveTime, bondTime: codeBondTime }

      console.log('authCode created --- ', authCode)

      const db = getDbConnection()
      const res = await crudCreate<AuthCode, typeof body>(db, TableAuthCodes, body)
      if (res) {
        return c.json(res, 200)
      }
      return c.json(ErrInsertFailed, 500)
    }
  )
  .openapi(
    createRoute({
      method: 'get',
      tags: ['Codes'],
      path: '/{uuid}',
      request: {
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: '',
          content: {
            'application/json': {
              schema: AuthCodeSelectSchema
            }
          }
        },
        404: {
          description: 'Malformed request',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
      }
    }),
    async (c) => {
      const db = getDbConnection()
      const { uuid } = c.req.valid('param')

      const res = await crudRead<AuthCode>(db, TableAuthCodes, uuid)
      if (res) {
        return c.json(res, 200)
      }

      return c.json(ErrNotFound, 404)
    }
  )
  .openapi(
    createRoute({
      method: 'delete',
      tags: ['Codes'],
      path: '/{uuid}',
      request: {
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'AuthCode deleted',
          content: {
            'application/json': {
              schema: z.object({
                uuid: z.string()
              })
            }
          }
        },
      }
    }),
    async (c) => {
      const db = getDbConnection()
      const { uuid } = c.req.valid('param')
      await crudDelete(db, TableAuthCodes, uuid)
      return c.json({ uuid }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'patch',
      tags: ['Codes'],
      path: '/{uuid}',
      request: {
        body: {
          description: 'Update an AuthCode',
          content: {
            'application/json': {
              schema: AuthCodeInsertSchema
            }
          }
        },
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'A new AuthCode',
          content: {
            'application/json': {
              schema: AuthCodeSelectSchema
            }
          }
        },
        404: {
          description: 'Failed to create a new AuthCode',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        }
      }
    }),
    async (c) => {
      const db = getDbConnection()

      const { uuid } = c.req.valid('param')
      const body = c.req.valid('json')

      const res = await crudUpdatePatch<AuthCode, typeof body>(db, TableAuthCodes, uuid, body)
      if (res) {
        return c.json(res, 200)
      }
      return c.json(ErrNotFound, 404)
    }
  )