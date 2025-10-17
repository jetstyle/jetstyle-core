import { randomUUID } from 'node:crypto'

import { and, eq } from 'drizzle-orm'

import { config } from './config.js'
import { getDbConnection } from './db.js'
import { AuthServer } from './model.js'
import { TableUsers, TableTenants } from './schema.js'

/**
 * Default seed function for auth-svc.
 * - Creates management tenant "platform" (config.adminTenant) if it doesn't exist.
 * - Creates admin user for this tenant if it doesn't exist.
 * - Uses config.adminTenant and config.adminPassword (from ENV).
 * @param authServer - instance of the AuthServer
 */
const defaultSeedFunc = async (authServer: AuthServer) => {
  const db = getDbConnection()

  if (config.adminTenant && config.adminPassword) {
    // Ensure admin user exists
    const adminList = await db
      .select()
      .from(TableUsers)
      .where(
        and(
          eq(TableUsers.username, 'admin'),
          eq(TableUsers.tenant, config.adminTenant)
        )
      )
      .limit(1)

    if (adminList.length === 0 || !adminList[0]) {
      // create user
      const result = await authServer.createUserWithPassword({
        tenant: config.adminTenant,
        username: 'admin',
        password: config.adminPassword,
        scopes: ['admin'],
      })

      if (result.err !== null) {
        console.log('Seed error', result.err, result.errDescription)
      } else {
        console.log('Seed: ok')
      }
    } else {
      console.log('Seed: has admin')
    }
  }

  if (config.adminTenant) {
    // Ensure management tenant exists
    const adminTenant = await db
      .select()
      .from(TableTenants)
      .where(eq(TableTenants.name, config.adminTenant))
      .limit(1)

    if (adminTenant.length === 0) {
      await db.insert(TableTenants).values({
        uuid: randomUUID(),
        name: config.adminTenant,
        displayName: config.adminTenant,
        tenantType: 'tenant-management',
      })
      console.log('Seed: management tenant created')
    }
  }
}

export default defaultSeedFunc
