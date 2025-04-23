import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

import {
  ListQueryValidator,
  ListRespValidator,
  ErrRespValidator,
  ErrInsertFailed,
  ErrNotFound,
  crudList,
  crudCreate,
  crudRead,
  crudDelete,
  crudUpdatePatch,
} from '@jetstyle/hono-drizzle-tools'

import { getDbConnection } from '../db.js'
import {
  Project,
  TableProjects,
  ProjectInsertSchema,
  ProjectSelectSchema,
} from '../schema.js'

const app = new OpenAPIHono()

export const projectsApp = app.openapi(
  createRoute({
    method: 'get',
    tags: ['Projects'],
    path: '/',
    request: {
      query: ListQueryValidator,
    },
    responses: {
      200: {
        description: 'A list of Projects',
        content: {
          'application/json': {
            schema: ListRespValidator.extend({
              result: z.array(ProjectSelectSchema),
            })
          }
        }
      }
    }
  }),
  async (c) => {
    const db = getDbConnection()
    const query = c.req.valid('query')
    const resp = await crudList<Project>(db, TableProjects, query)
    return c.json(resp, 200)
  }
)
  .openapi(
    createRoute({
      method: 'post',
      tags: ['Projects'],
      path: '/',
      request: {
        body: {
          description: 'Create a Project',
          content: {
            'application/json': {
              schema: ProjectInsertSchema
            }
          }
        },
      },
      responses: {
        200: {
          description: 'A new Project',
          content: {
            'application/json': {
              schema: ProjectSelectSchema
            }
          }
        },
        500: {
          description: 'Failed to create a new Project',
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

      const res = await crudCreate<Project, typeof body>(db, TableProjects, body)

      if (res) {
        return c.json(res, 200)
      }

      return c.json(ErrInsertFailed, 500)
    }
  )
  .openapi(
    createRoute({
      method: 'get',
      tags: ['Projects'],
      path: '/{uuid}',
      request: {
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'A Project by UUID',
          content: {
            'application/json': {
              schema: ProjectSelectSchema
            }
          }
        },
        404: {
          description: 'Project not found',
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

      const res = await crudRead<Project>(db, TableProjects, uuid)
      if (res) {
        return c.json(res, 200)
      }

      return c.json(ErrNotFound, 404)
    }
  )
  .openapi(
    createRoute({
      method: 'delete',
      tags: ['Projects'],
      path: '/{uuid}',
      request: {
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'Project deleted',
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
      await crudDelete(db, TableProjects, uuid)
      return c.json({ uuid }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'patch',
      tags: ['Projects'],
      path: '/{uuid}',
      request: {
        body: {
          description: 'Update a Project',
          content: {
            'application/json': {
              schema: ProjectInsertSchema
            }
          }
        },
        params: z.object({
          uuid: z.string()
        })
      },
      responses: {
        200: {
          description: 'A new Project',
          content: {
            'application/json': {
              schema: ProjectSelectSchema
            }
          }
        },
        404: {
          description: 'Failed to create a new Project',
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

      const res = await crudUpdatePatch<Project, typeof body>(db, TableProjects, uuid, body)
      if (res) {
        return c.json(res, 200)
      }
      return c.json(ErrNotFound, 404)
    }
  )
