import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'

import {
  ListQueryValidator,
  ListRespValidator,
  ErrRespValidator,
  ErrInsertFailed,
  ErrNotFound,
  ErrForbiddenDescription,
  ErrForbidden,
  crudList,
  crudCreate,
  crudRead,
  crudDelete,
  crudUpdatePatch,
} from '@jetstyle/hono-drizzle-tools'
import { getPermissions } from '@jetstyle/server-auth'

import { getDbConnection } from '../db.js'
import {
  User,
  TableUsers,
  UserInsertSchema,
  UserSelectSchema,
  TableAuthCodes,
} from '../schema.js'

const app = new OpenAPIHono()

export const usersRoutes = app.openapi(
  createRoute({
    method: 'get',
    tags: ['Users'],
    path: '/',
    request: {
      query: ListQueryValidator
    },
    responses: {
      200: {
        description: 'A list of Users',
        content: {
          'application/json': {
            schema: ListRespValidator.extend({
              result: z.array(UserSelectSchema),
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

    const resp = await crudList<User>(db, TableUsers, query)
    return c.json(resp, 200)
  }
)
  .openapi(
    createRoute({
      method: 'post',
      tags: ['Users'],
      path: '/',
      request: {
        body: {
          description: 'Create a User',
          content: {
            'application/json': {
              schema: UserInsertSchema
            }
          }
        },
      },
      responses: {
        200: {
          description: 'A new User',
          content: {
            'application/json': {
              schema: UserSelectSchema
            }
          }
        },
        500: {
          description: 'Failed to create a new User',
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
      const body = c.req.valid('json')

      const res = await crudCreate<User, typeof body>(db, TableUsers, body)

      if (res) {
        return c.json(res, 200)
      }

      return c.json(ErrInsertFailed, 500)
    }
  )
  .openapi(
    createRoute({
      method: 'get',
      tags: ['Users'],
      path: '/{uuid}',
      request: {
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'A User by UUID',
          content: {
            'application/json': {
              schema: UserSelectSchema
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
        }
      }
    }),
    async (c) => {
      const db = getDbConnection()
      const { uuid } = c.req.valid('param')

      const res = await crudRead<User>(db, TableUsers, uuid)
      if (res) {
        return c.json(res, 200)
      }

      return c.json(ErrNotFound, 404)
    }
  )
  .openapi(
    createRoute({
      method: 'delete',
      tags: ['Users'],
      path: '/{uuid}',
      request: {
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'User deleted',
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
      await crudDelete(db, TableUsers, uuid)
      return c.json({ uuid }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'patch',
      tags: ['Users'],
      path: '/{uuid}',
      request: {
        body: {
          description: 'Update a User',
          content: {
            'application/json': {
              schema: UserInsertSchema
            }
          }
        },
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'A new User',
          content: {
            'application/json': {
              schema: UserSelectSchema
            }
          }
        },
        404: {
          description: 'Failed to create a new User',
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

      const res = await crudUpdatePatch<User, typeof body>(db, TableUsers, uuid, body)
      if (res) {
        return c.json(res, 200)
      }
      return c.json(ErrNotFound, 404)
    }
  )
  .openapi(
    createRoute({
      method: 'post',
      tags: ['Users'],
      path: '/{uuid}/set-password',
      request: {
        body: {
          description: 'Set a new password for the user',
          content: {
            'application/json': {
              schema: z.object({
                password: z.string(),
              })
            }
          }
        },
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: z.object({
                success: z.boolean(),
              })
            }
          }
        },
        403: ErrForbiddenDescription,
        404: {
          description: 'User not found',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
        409: {
          description: 'User not found',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
        500: {
          description: 'Failed to update the password',
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
      const authServer = c.get('authServer')
      const body = c.req.valid('json')
      const { uuid } = c.req.valid('param')

      const existingUser = await crudRead<User>(db, TableUsers, uuid)
      if (!existingUser) {
        return c.json(ErrNotFound, 404)
      }

      const authHeader = c.req.header('Authorization')
      const permission = await getPermissions(['users:admin', 'users:read'], authHeader)

      if (permission.level === 'denied') {
        return c.json(ErrForbidden, 403)
      }
      if (permission.tenant && existingUser.tenant !== permission.tenant) {
        return c.json(ErrForbidden, 403)
      }

      const hashedPasswd = await authServer.hashPassword(body.password)
      if (hashedPasswd.err !== null) {
        return c.json(hashedPasswd, 500)
      }

      await db.update(TableUsers)
        .set({ password: hashedPasswd.value })
        .where(eq(TableUsers.uuid, existingUser.uuid))

      return c.json({ success: true }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'post',
      tags: ['Users'],
      path: '/{uuid}/set-code',
      request: {
        body: {
          description: 'Set a new code for the user',
          content: {
            'application/json': {
              schema: z.object({
                code: z.string(),
              })
            }
          }
        },
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: z.object({
                success: z.boolean(),
              })
            }
          }
        },
        403: ErrForbiddenDescription,
        404: {
          description: 'User not found',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
        500: {
          description: 'Failed to update the code',
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
      const body = c.req.valid('json')
      const { uuid } = c.req.valid('param')

      const existingUser = await crudRead<User>(db, TableUsers, uuid)
      if (!existingUser) {
        return c.json(ErrNotFound, 404)
      }

      const authHeader = c.req.header('Authorization')
      const permission = await getPermissions(['users:admin', 'users:read'], authHeader)

      if (permission.level === 'denied') {
        return c.json(ErrForbidden, 403)
      }
      if (permission.tenant && existingUser.tenant !== permission.tenant) {
        return c.json(ErrForbidden, 403)
      }

      await db.update(TableAuthCodes)
        .set({ code: body.code })
        .where(eq(TableAuthCodes.userId, existingUser.uuid))

      return c.json({ success: true }, 200)
    }
  )