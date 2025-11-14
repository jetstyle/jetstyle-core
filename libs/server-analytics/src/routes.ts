import { OpenAPIHono, createRoute } from '@hono/zod-openapi'

import {
  ErrInsertFailed,
  ErrRespValidator,
  crudCreate
} from '@jetstyle/server-crud'

import {
  type AnalyticsEvent,
  TableAnalyticsEvents,
  AnalyticsEventInsertSchema,
  AnalyticsEventSelectSchema,
} from './schema.js'
import { type DB } from './types.js'

export function createRoutes<T extends DB>(db: T) {
  const app = new OpenAPIHono()

  const analyticsEventsApp = app
    .openapi(
      createRoute({
        method: 'post',
        tags: ['Analytics Events'],
        path: '/',
        request: {
          body: {
            description: 'Track event',
            content: {
              'application/json': {
                schema: AnalyticsEventInsertSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: 'A new Prompt',
            content: {
              'application/json': {
                schema: AnalyticsEventSelectSchema,
              },
            },
          },
          500: {
            description: 'Failed to create a new Prompt',
            content: {
              'application/json': {
                schema: ErrRespValidator,
              },
            },
          },
        },
      }),
      async (c) => {
        const body = c.req.valid('json')
        const res = await crudCreate<AnalyticsEvent, typeof body>(db, TableAnalyticsEvents, body)

        if (res) {
          return c.json(res, 200)
        }

        return c.json(ErrInsertFailed, 500)
      },
    )

  return analyticsEventsApp
}
