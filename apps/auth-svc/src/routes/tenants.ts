import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { eq, or } from 'drizzle-orm'

import {
  ListQueryValidator,
  ListRespValidator,
  ErrRespValidator,
  ErrInsertFailed,
  ErrNotFound,
  ErrForbidden,
  ErrForbiddenDescription,
  crudList,
  crudCreate,
  crudRead,
  crudDelete,
  crudUpdatePatch,
} from '@jetstyle/hono-drizzle-tools'
import { getPermissions } from '@jetstyle/server-auth'

import { getDbConnection } from '../db.js'
import { getChildTenants, getTenantByName, getTenantByOwner } from '../model.js'
import {
  Tenant,
  TableTenants,
  TenantInsertSchema,
  TenantSelectSchema,
} from '../schema.js'

const app = new OpenAPIHono()

export const tenantsApp = app.openapi(
  createRoute({
    method: 'get',
    tags: ['Tenants'],
    path: '/',
    request: {
      query: ListQueryValidator,
    },
    responses: {
      200: {
        description: 'A list of Tenants',
        content: {
          'application/json': {
            schema: ListRespValidator.extend({
              result: z.array(TenantSelectSchema),
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
    const permission = await getPermissions(['tenants:admin', 'tenants:read'], authHeader)

    if (permission.level === 'denied') {
      return c.json(ErrForbidden, 403)
    }

    console.log('tenant:crud @ permission', permission)

    if (permission.tenant) {
      if (query.tenant && query.tenant !== permission.tenant) {
        return c.json(ErrForbidden, 403)
      }
    }

    let customWhere: any = null
    if (query.tenant) {
      customWhere = or(
        eq(TableTenants.name, query.tenant),
        eq(TableTenants.parentTenantName, query.tenant)
      )
    }

    console.log('@query', query)
    query.tenant = undefined // Tenant has no tenant field
    const resp = await crudList<Tenant>(db, TableTenants, query, customWhere)
    return c.json(resp, 200)
  }
)
  .openapi(
    createRoute({
      method: 'post',
      tags: ['Tenants'],
      path: '/',
      request: {
        body: {
          description: 'Create a Tenant',
          content: {
            'application/json': {
              schema: TenantInsertSchema
            }
          }
        },
      },
      responses: {
        200: {
          description: 'A new Tenant',
          content: {
            'application/json': {
              schema: TenantSelectSchema
            }
          }
        },
        500: {
          description: 'Failed to create a new Tenant',
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

      const res = await crudCreate<Tenant, typeof body>(db, TableTenants, body)

      if (res) {
        return c.json(res, 200)
      }

      return c.json(ErrInsertFailed, 500)
    }
  )
  .openapi(
    createRoute({
      method: 'get',
      tags: ['Tenants'],
      path: '/by-name/{name}',
      request: {
        params: z.object({
          name: z.string()
        })
      },
      responses: {
        200: {
          description: 'A Tenant by name',
          content: {
            'application/json': {
              schema: TenantSelectSchema
            }
          }
        },
        404: {
          description: 'Tenant not found',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
        403: ErrForbiddenDescription,
      }
    }),
    async (c) => {
      const { name } = c.req.valid('param')

      const authHeader = c.req.header('Authorization')
      const permission = await getPermissions(['tenants:admin'], authHeader)

      if (permission.level === 'denied') {
        return c.json(ErrForbidden, 403)
      }
      if (permission.tenant && permission.tenant !== name) {
        return c.json(ErrForbidden, 403)
      }

      console.log('@ tenant name', name)

      const tenant = await getTenantByName(name)
      if (tenant) {
        return c.json(tenant, 200)
      }

      return c.json(ErrNotFound, 404)
    }
  )
  .openapi(
    createRoute({
      method: 'get',
      tags: ['Tenants'],
      path: '/by-user/{userId}',
      request: {
        params: z.object({
          userId: z.string()
        })
      },
      responses: {
        200: {
          description: 'A list of Tenants',
          content: {
            'application/json': {
              schema: z.object({
                result: z.array(TenantSelectSchema)
              })
            }
          }
        },
        403: ErrForbiddenDescription,
      }
    }),
    async (c) => {
      const { userId } = c.req.valid('param')

      const authHeader = c.req.header('Authorization')
      const permission = await getPermissions(['tenants:admin'], authHeader)

      if (permission.level === 'denied') {
        return c.json(ErrForbidden, 403)
      }

      let res: Array<Tenant> = []

      const tenant = await getTenantByOwner(userId)
      if (tenant && tenant.tenantType === 'customer-tenant') {
        res.push(tenant)
        return c.json({ result: res }, 200)
      }
      if (tenant && tenant.tenantType === 'tenant-management') {
        const childTenants = await getChildTenants(tenant.name) || []
        res.push(...childTenants, tenant)
        return c.json({ result: res }, 200)
      }
      return c.json({ result: res }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'get',
      tags: ['Tenants'],
      path: '/{uuid}',
      request: {
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'A Tenant by UUID',
          content: {
            'application/json': {
              schema: TenantSelectSchema
            }
          }
        },
        404: {
          description: 'Tenant not found',
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

      const res = await crudRead<Tenant>(db, TableTenants, uuid)
      if (res) {
        return c.json(res, 200)
      }

      return c.json(ErrNotFound, 404)
    }
  )
  .openapi(
    createRoute({
      method: 'delete',
      tags: ['Tenants'],
      path: '/{uuid}',
      request: {
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'Tenant deleted',
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
      await crudDelete(db, TableTenants, uuid)
      return c.json({ uuid }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'patch',
      tags: ['Tenants'],
      path: '/{uuid}',
      request: {
        body: {
          description: 'Update a Tenant',
          content: {
            'application/json': {
              schema: TenantInsertSchema
            }
          }
        },
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'A new Tenant',
          content: {
            'application/json': {
              schema: TenantSelectSchema
            }
          }
        },
        404: {
          description: 'Failed to create a new Tenant',
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

      const res = await crudUpdatePatch<Tenant, typeof body>(db, TableTenants, uuid, body)
      if (res) {
        return c.json(res, 200)
      }
      return c.json(ErrNotFound, 404)
    }
  )
