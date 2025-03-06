import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { TableTasks, Task, TaskInsertSchema, TaskSelectSchema } from '../schema.js'
import { getDbConnection } from '../db.js'
import {
  ListQueryValidator,
  ListRespValidator,
  ErrRespValidator,
  ErrNotFound,
  ErrInsertFailed,
  crudList,
  crudCreate,
  crudRead,
  crudDelete,
  crudUpdatePatch
} from '@jetstyle/hono-drizzle-tools'

const app = new OpenAPIHono()

export const tasksApp = app.openapi(
  createRoute({
    method: 'get',
    tags: ['Tasks'],
    path: '/',
    request: {
      query: ListQueryValidator
    },
    responses: {
      200: {
        description: 'A list of Tasks',
        content: {
          'application/json': {
            schema: ListRespValidator.extend({
              result: z.array(TaskSelectSchema),
            })
          }
        }
      }
    }
  }),
  async (c) => {
    const db = getDbConnection()
    const query = c.req.valid('query')
    const result = await crudList<Task>(db, TableTasks, query)
    return c.json(result, 200)
  }
)
  .openapi(
    createRoute({
      method: 'post',
      tags: ['Tasks'],
      path: '/',
      request: {
        body: {
          content: {
            'application/json': {
              schema: TaskInsertSchema
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Task created',
          content: {
            'application/json': {
              schema: TaskSelectSchema
            }
          }
        },
        500: {
          description: 'Failed to create a new Task',
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
      const task = await crudCreate<Task, typeof body>(db, TableTasks, body)
      if (task) {
        return c.json(task, 200)
      } else {
        return c.json(ErrInsertFailed, 500)
      }
    }
  )
  .openapi(
    createRoute({
      method: 'get',
      tags: ['Tasks'],
      path: '/{uuid}',
      request: {
        params: z.object({ uuid: z.string() })
      },
      responses: {
        200: {
          description: 'A Task by UUID',
          content: {
            'application/json': {
              schema: TaskSelectSchema
            }
          }
        },
        404: {
          description: 'Task not found',
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
      const task = await crudRead<Task>(db, TableTasks, uuid)
      if (!task) {
        return c.json(ErrNotFound, 404)
      }
      return c.json(task, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'delete',
      tags: ['Tasks'],
      path: '/{uuid}',
      request: {
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'Task deleted',
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
      await crudDelete(db, TableTasks, uuid)
      return c.json({ uuid }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'patch',
      tags: ['Tasks'],
      path: '/{uuid}',
      request: {
        body: {
          content: {
            'application/json': {
              schema: TaskInsertSchema
            }
          }
        },
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'Updated Task',
          content: {
            'application/json': {
              schema: TaskSelectSchema
            }
          }
        },
        404: {
          description: 'Task not found',
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
      const updated = await crudUpdatePatch<Task, typeof body>(db, TableTasks, uuid, body)
      if (!updated) {
        return c.json(ErrNotFound, 404)
      }
      return c.json(updated, 200)
    }
  )