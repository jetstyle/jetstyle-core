import { z } from '@hono/zod-openapi'

import { pgTable, serial, varchar, timestamp, text, jsonb, integer } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

// *********************************************
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

export const UserPatchSchema = UserInsertSchema.partial()

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
    enum: ['active', 'inactive']
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

export const BasicAuthAccountUpdateSchema = BasicAuthAccountInsertSchema.partial()

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