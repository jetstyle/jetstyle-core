import { pgTable, serial, varchar, timestamp, text } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

export const TableAnalyticsEvents = pgTable('analytics_events', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  url: text('url'),
  eventLabel: varchar('event_label', { length: 256 }),
  eventAction: varchar('event_action', { length: 256 }),
  eventCategory: varchar('event_category', { length: 256 }),
  clientId: varchar('client_id', { length: 256 }),
  userId: varchar('user_id', { length: 256 }),
  sessionId: varchar('session_id', { length: 256 }),
})

export type NewAnalyticsEvent = typeof TableAnalyticsEvents.$inferInsert

export type AnalyticsEvent = typeof TableAnalyticsEvents.$inferSelect

export const AnalyticsEventInsertSchema = createInsertSchema(TableAnalyticsEvents).omit({
  id: true,
  uuid: true,
  createdAt: true,
  updatedAt: true,
})

export const AnalyticsEventSelectSchema = createSelectSchema(TableAnalyticsEvents)
