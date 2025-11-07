import { z } from '@hono/zod-openapi'
import { pgTable, serial, text, varchar, timestamp, integer, jsonb } from 'drizzle-orm/pg-core'
import {
  createInsertSchema,
  createSelectSchema
} from 'drizzle-zod'

export * from '@jetstyle/server-auth/schema'

export const TableRefreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

  token: varchar('token', { length: 512 }).notNull(),
  userId: varchar('user_id', { length: 256 }).notNull(),
  ttl: integer('ttl'),

  device: varchar('device', { length: 256 }),
  ipAddress: varchar('ip_address', { length: 256 }),
  userAgent: text('user_agent'),

  loginStatus: varchar(
    'login_status',
    { length: 256, enum: ['active', 'logged-out'] }
  )
})

export const RefreshTokenInsertSchema = createInsertSchema(TableRefreshTokens)
  .omit({
    id: true,
    uuid: true,
    createdAt: true,
    updatedAt: true,
  })

export type NewRefreshToken = typeof TableRefreshTokens.$inferInsert
export type RefreshToken = typeof TableRefreshTokens.$inferSelect
export type NewRefreshTokenRequest = z.infer<typeof RefreshTokenInsertSchema>

export const RefreshTokenSelectSchema = createSelectSchema(TableRefreshTokens)

// ****************************************************************************

export const TableTenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

  name: varchar('name', { length: 256 }).notNull(),
  displayName: varchar('display_name', { length: 256 }).notNull(),
  ownerUserId: varchar('owner_user_id', { length: 256 }),

  tenantType: varchar('tenant_type', {
    length: 256,
    enum: ['tenant-management', 'customer-tenant']
  }).notNull(),

  logoAssetId: varchar('logo_asset_id', { length: 256 }),
  logoUrl: varchar('logo_url', { length: 512 }),

  parentTenantName: varchar('parent_tenant_name', { length: 256 })
})

export const TenantInsertSchema = createInsertSchema(TableTenants)
  .omit({
    id: true,
    uuid: true,
    createdAt: true,
    updatedAt: true,
  })

export type NewTenant = typeof TableTenants.$inferInsert
export type Tenant = typeof TableTenants.$inferSelect
export type NewTenantRequest = z.infer<typeof TenantInsertSchema>

export const TenantSelectSchema = createSelectSchema(TableTenants)

// ****************************************************************************

export const TableAuthCodes = pgTable('auth_codes', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

  userId: varchar('user_id', { length: 256 }).notNull(),
  code: varchar('code', { length: 512 }).notNull(),

  bondTime: integer('bond_time').notNull(),
  liveTime: integer('live_time').notNull(),
})

export const AuthCodeInsertSchema = createInsertSchema(TableAuthCodes)
  .omit({
    id: true,
    uuid: true,
    createdAt: true,
    updatedAt: true,
  })

export type NewAuthCode = typeof TableAuthCodes.$inferInsert
export type AuthCode = typeof TableAuthCodes.$inferSelect
export type NewAuthCodeRequest = z.infer<typeof AuthCodeInsertSchema>

export const AuthCodeSelectSchema = createSelectSchema(TableAuthCodes)

// ****************************************************************************
// PermissionBind entity (ported from aibi)

export const TablePermissionBinds = pgTable('permission_binds', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

  userId: varchar('user_id', { length: 256 }).notNull(),
  tenant: varchar('tenant', { length: 256 }).notNull(),
  scopes: jsonb('scopes').$type<Array<string>>().default([]),
  activationStatus: varchar('activation_status', { length: 256, enum: ['active', 'inactive'] })
    .notNull()
    .default('active'),
})

export const PermissionBindInsertSchema = createInsertSchema(TablePermissionBinds)
  .omit({
    id: true,
    uuid: true,
    createdAt: true,
    updatedAt: true,
    scopes: true,
  })
  .extend({
    scopes: z.array(z.string()).nullable().optional()
  })

export type NewPermissionBind = typeof TablePermissionBinds.$inferInsert
export type PermissionBind = typeof TablePermissionBinds.$inferSelect
export type NewPermissionBindRequest = z.infer<typeof PermissionBindInsertSchema>

export const PermissionBindSelectSchema = createSelectSchema(TablePermissionBinds)
  .omit({
    scopes: true
  })
  .extend({
    scopes: z.array(z.string()).nullable().optional()
  })

export const PermissionBindPatchSchema = PermissionBindInsertSchema.partial()

// ****************************************************************************
// Contact entity (ported from aibi)

export const TableContacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

  tenant: varchar('tenant', { length: 256 }).notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: varchar('email', { length: 256 }),
  phone: varchar('phone', { length: 256 }),
  avatarFileId: varchar('avatar_file_id', { length: 256 }),
  avatarUrl: text('avatar_url'),

  userId: varchar('user_id', { length: 256 }),
  inviteCode: varchar('invite_code', { length: 256 }),
})

export const ContactInsertSchema = createInsertSchema(TableContacts)
  .omit({
    id: true,
    uuid: true,
    createdAt: true,
    updatedAt: true,
  })

export type NewContact = typeof TableContacts.$inferInsert
export type Contact = typeof TableContacts.$inferSelect
export type NewContactRequest = z.infer<typeof ContactInsertSchema>

export const ContactSelectSchema = createSelectSchema(TableContacts)
