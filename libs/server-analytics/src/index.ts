import { createRoutes } from './routes.js'
import { type DB } from './types.js'

export function createPlugin<T extends DB>(db: T) {
  const routes = createRoutes(db)

  return { routes }
}
