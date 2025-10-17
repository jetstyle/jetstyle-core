import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

import { getDbConnection } from '../db.js'
import {
  TablePermissionBinds,
  PermissionBindInsertSchema,
  PermissionBindSelectSchema
} from '../schema.js'

const app = new OpenAPIHono()

// Получить PermissionBind по userId и tenant
app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['PermissionBinds'],
    request: {
      query: z.object({
        userId: z.string().openapi({ example: 'user-uuid' }),
        tenant: z.string().openapi({ example: 'tenant-name' }),
      }),
    },
    responses: {
      200: {
        description: 'PermissionBind for user+tenant',
        content: {
          'application/json': {
            schema: PermissionBindSelectSchema.nullable()
          }
        }
      },
      404: {
        description: 'Not found',
        content: {
          'application/json': {
            schema: z.object({ error: z.string() })
          }
        }
      }
    }
  }),
  async (c) => {
    const db = getDbConnection()
    const { userId, tenant } = c.req.valid('query')
    const rows = await db
      .select()
      .from(TablePermissionBinds)
      .where(and(eq(TablePermissionBinds.userId, userId), eq(TablePermissionBinds.tenant, tenant)))
    if (rows.length === 0) {
      return c.json({ error: 'Not found' }, 404)
    }
    return c.json(rows[0], 200)
  }
)

// Создать или обновить PermissionBind по userId и tenant
app.openapi(
  createRoute({
    method: 'post',
    path: '/',
    tags: ['PermissionBinds'],
    request: {
      body: {
        description: 'Create or update PermissionBind',
        content: {
          'application/json': {
            schema: PermissionBindInsertSchema.extend({
              userId: z.string(),
              tenant: z.string(),
              scopes: z.array(z.string()).nullable().optional()
            })
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Created or updated PermissionBind',
        content: {
          'application/json': {
            schema: PermissionBindSelectSchema
          }
        }
      }
    }
  }),
  async (c) => {
    const db = getDbConnection()
    const { userId, tenant, scopes } = c.req.valid('json')
    // Проверяем, есть ли уже запись
    const rows = await db
      .select()
      .from(TablePermissionBinds)
      .where(and(eq(TablePermissionBinds.userId, userId), eq(TablePermissionBinds.tenant, tenant)))
    let result
    if (rows.length === 0) {
      // Создать новую
      const [inserted] = await db
        .insert(TablePermissionBinds)
        .values({
          userId,
          tenant,
          scopes: scopes ?? [],
          uuid: randomUUID(),
        })
        .returning()
      result = inserted
    } else {
      // Обновить существующую
      const [updated] = await db
        .update(TablePermissionBinds)
        .set({ scopes: scopes ?? [] })
        .where(and(eq(TablePermissionBinds.userId, userId), eq(TablePermissionBinds.tenant, tenant)))
        .returning()
      result = updated
    }
    return c.json(result, 200)
  }
)

// Удалить PermissionBind по userId и tenant
app.openapi(
  createRoute({
    method: 'delete',
    path: '/',
    tags: ['PermissionBinds'],
    request: {
      query: z.object({
        userId: z.string().openapi({ example: 'user-uuid' }),
        tenant: z.string().openapi({ example: 'tenant-name' }),
      }),
    },
    responses: {
      200: {
        description: 'Deleted',
        content: {
          'application/json': {
            schema: z.object({ success: z.boolean() })
          }
        }
      }
    }
  }),
  async (c) => {
    const db = getDbConnection()
    const { userId, tenant } = c.req.valid('query')
    await db
      .delete(TablePermissionBinds)
      .where(and(eq(TablePermissionBinds.userId, userId), eq(TablePermissionBinds.tenant, tenant)))
    return c.json({ success: true }, 200)
  }
)

export default app
