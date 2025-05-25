import { z } from '@hono/zod-openapi'
import { pgTable, serial, text, varchar, timestamp, integer, jsonb } from 'drizzle-orm/pg-core'
import {
  createInsertSchema,
  createSelectSchema
} from 'drizzle-zod'

export const TableUsers = pgTable('users', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

  tenant: varchar('tenant', { length: 256 }).notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  username: varchar('username', { length: 256 }),
  password: varchar('password', { length: 256 }),
  email: varchar('email', { length: 256 }),
  phone: varchar('phone', { length: 256 }),
  locale: varchar('locale', { length: 256 }),
  geoRegion: varchar('geo_region', { length: 256 }),

  avatarFileId: varchar('avatar_file_id', { length: 256 }),
  avatarUrl: text('avatar_url'),

  scopes: jsonb('scopes').$type<Array<string>>().default([])
})

export const UserInsertSchema = createInsertSchema(TableUsers)
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

export type NewUser = typeof TableUsers.$inferInsert
export type User = typeof TableUsers.$inferSelect
export type NewUserRequest = z.infer<typeof UserInsertSchema>

export const UserSelectSchema = createSelectSchema(TableUsers)
  .omit({
    scopes: true
  })
  .extend({
    scopes: z.array(z.string()).nullable().optional()
  })

// ****************************************************************************

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

export const TableBasicAuthAccounts = pgTable('basic_auth_accounts', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

  login: varchar('login', { length: 256 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 256 }).notNull(),

  tenant: varchar('tenant', { length: 256 }),
  lastLoginAt: timestamp('last_login_at'),
  loginAttempts: integer('login_attempts').notNull().default(0),
  status: varchar('status', {
    length: 64,
    enum: ['active', 'locked', 'disabled']
  }).notNull().default('active'),

  roles: jsonb('roles').$type<Array<string>>().default([]),
})

export const BasicAuthAccountInsertSchema = createInsertSchema(TableBasicAuthAccounts)
  .omit({
    id: true,
    uuid: true,
    createdAt: true,
    updatedAt: true,
    lastLoginAt: true,
    loginAttempts: true,
    roles: true,
    passwordHash: true
  })
  .extend({
    roles: z.array(z.string()).nullable().optional(),
    password: z.string().min(8)
  })

export type NewBasicAuthAccount = typeof TableBasicAuthAccounts.$inferInsert
export type BasicAuthAccount = typeof TableBasicAuthAccounts.$inferSelect
export type NewBasicAuthAccountRequest = z.infer<typeof BasicAuthAccountInsertSchema>

export const BasicAuthAccountSelectSchema = createSelectSchema(TableBasicAuthAccounts)
  .omit({
    passwordHash: true
  })
  .extend({
    roles: z.array(z.string()).nullable().optional()
  })