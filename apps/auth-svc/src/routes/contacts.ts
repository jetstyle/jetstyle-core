import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

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
  Contact,
  TableContacts,
  ContactInsertSchema,
  ContactSelectSchema,
} from '../schema.js'

const app = new OpenAPIHono()

export const contactsApp = app.openapi(
  createRoute({
    method: 'get',
    tags: ['Contacts'],
    path: '/',
    request: {
      query: ListQueryValidator
    },
    responses: {
      200: {
        description: 'A list of Contacts',
        content: {
          'application/json': {
            schema: ListRespValidator.extend({
              result: z.array(ContactSelectSchema),
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
    const tenantsObj = permission.parsedAccessToken?.tenants ?? {}
    const tenantScopes = query.tenant ? tenantsObj[query.tenant] ?? [] : []

    if (permission.level === 'denied') {
      return c.json(ErrForbidden, 403)
    }
    if (permission.tenant) {
      if (query.tenant && (query.tenant !== permission.tenant && tenantScopes.length === 0)) {
        return c.json(ErrForbidden, 403)
      }
    }

    const resp = await crudList<Contact>(db, TableContacts, query)
    return c.json(resp, 200)
  }
)
  .openapi(
    createRoute({
      method: 'post',
      tags: ['Contacts'],
      path: '/',
      request: {
        body: {
          description: 'Create a Contact',
          content: {
            'application/json': {
              schema: ContactInsertSchema
            }
          }
        },
      },
      responses: {
        200: {
          description: 'A new Contact',
          content: {
            'application/json': {
              schema: ContactSelectSchema
            }
          }
        },
        403: ErrForbiddenDescription,
        500: {
          description: 'Failed to create a new Contact',
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

      const authHeader = c.req.header('Authorization')
      const permission = await getPermissions(['contacts:admin'], authHeader)
      if (permission.level === 'denied') {
        return c.json(ErrForbidden, 403)
      }

      const res = await crudCreate<Contact, typeof body>(db, TableContacts, body)

      if (res) {
        return c.json(res, 200)
      }

      return c.json(ErrInsertFailed, 500)
    }
  )
  .openapi(
    createRoute({
      method: 'get',
      tags: ['Contacts'],
      path: '/{uuid}',
      request: {
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'A Contact by UUID',
          content: {
            'application/json': {
              schema: ContactSelectSchema
            }
          }
        },
        404: {
          description: 'Contact not found',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
        403: ErrForbiddenDescription
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

      const res = await crudRead<Contact>(db, TableContacts, uuid)
      if (res) {
        return c.json(res, 200)
      }
      return c.json(ErrNotFound, 404)
    }
  )
  .openapi(
    createRoute({
      method: 'delete',
      tags: ['Contacts'],
      path: '/{uuid}',
      request: {
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'Contact deleted',
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
      await crudDelete(db, TableContacts, uuid)
      return c.json({ uuid }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'patch',
      tags: ['Contacts'],
      path: '/{uuid}',
      request: {
        body: {
          description: 'Update a Contact',
          content: {
            'application/json': {
              schema: ContactInsertSchema
            }
          }
        },
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'A Contact',
          content: {
            'application/json': {
              schema: ContactSelectSchema
            }
          }
        },
        404: {
          description: 'Contact not found',
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

      const res = await crudUpdatePatch<Contact, typeof body>(db, TableContacts, uuid, body)
      if (res) {
        return c.json(res, 200)
      }
      return c.json(ErrNotFound, 404)
    }
  )

export default app
