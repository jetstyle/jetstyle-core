import { eq, and } from 'drizzle-orm'
import { getDbConnection } from '../db.js'
import { TablePermissionBinds, TableTenants, Tenant, User } from '../schema.js'

/**
 * Collects all tenant-level PermissionBind records for a user and returns a mapping:
 * { [tenantName]: Array<string> }
 * Each key is a tenant name, and the value is the array of scopes the user has in that tenant.
 */
export async function collectAllUserTenantPermissions(user: User): Promise<Record<string, Array<string>>> {
  const db = getDbConnection()
  const binds = await db
    .select()
    .from(TablePermissionBinds)
    .where(eq(TablePermissionBinds.userId, user.uuid))

  // Group by tenant, deduplicate scopes per tenant
  const tenants: Record<string, Array<string>> = {}
  for (const bind of binds) {
    if (!bind || typeof bind.tenant !== 'string') { continue }
    if (!Array.isArray(bind.scopes)) { continue }
    if (!tenants[bind.tenant]) {
      tenants[bind.tenant] = []
    }

    const arr = tenants[bind.tenant]
    if (arr) {
      arr.push(...bind.scopes)
    }
  }

  // Deduplicate scopes for each tenant
  for (const tenant in tenants) {
    if (Array.isArray(tenants[tenant])) {
      tenants[tenant] = Array.from(new Set(tenants[tenant]))
    }
  }
  return tenants
}

export type UserTenantPermissions = {
  tenant: string
  userId: string
  globalLevel: Array<string>
  parentTenantLevel: Array<string>
  tenantLevel: Array<string>
  scopes: Array<string>
}

/**
 * Collects all effective scopes for a user in a given tenant, including:
 * - global (from user.scopes)
 * - permissions assigned via PermissionBind for the tenant
 * - permissions assigned via PermissionBind for the parent tenant (if any)
 */
export async function collectUserTenantPermissions(user: User, tenantName: string): Promise<UserTenantPermissions> {
  const db = getDbConnection()

  // 1. Get PermissionBind for this user and tenant
  const tenantBinds = await db
    .select()
    .from(TablePermissionBinds)
    .where(and(
      eq(TablePermissionBinds.userId, user.uuid),
      eq(TablePermissionBinds.tenant, tenantName)
    ))

  const tenantLevel = tenantBinds.length > 0 && Array.isArray(tenantBinds[0]?.scopes)
    ? tenantBinds[0]?.scopes ?? []
    : []

  // 2. Get tenant by name
  const tenantRows = await db
    .select()
    .from(TableTenants)
    .where(eq(TableTenants.name, tenantName))

  const tenant: Tenant | undefined = tenantRows[0]
  let parentTenantLevel: Array<string> = []

  if (tenant && tenant.parentTenantName) {
    // 3. Get PermissionBind for user and parent tenant
    const parentBinds = await db
      .select()
      .from(TablePermissionBinds)
      .where(and(
        eq(TablePermissionBinds.userId, user.uuid),
        eq(TablePermissionBinds.tenant, tenant.parentTenantName)
      ))

    parentTenantLevel = parentBinds.length > 0 && Array.isArray(parentBinds[0]?.scopes)
      ? parentBinds[0]?.scopes ?? []
      : []
  }

  // 4. Global scopes from user
  const globalLevel = Array.isArray(user.scopes) ? user.scopes : []

  // 5. Deduplicate all scopes
  const scopes = Array.from(new Set([...globalLevel, ...parentTenantLevel, ...tenantLevel]))

  return {
    tenant: tenantName,
    userId: user.uuid,
    globalLevel,
    parentTenantLevel,
    tenantLevel,
    scopes,
  }
}
