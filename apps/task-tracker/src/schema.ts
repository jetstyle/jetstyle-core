import { pgTable, serial, varchar, timestamp, text } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from '@hono/zod-openapi'

export const TableTasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  status: varchar('status', {
    length: 64,
    enum: ['todo', 'in-progress', 'done', 'canceled']
  }).notNull(),
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description'),
  dueDate: timestamp('due_date'),
  priority: varchar('priority', { length: 64, enum: ['low', 'medium', 'high'] }),
  assignee: varchar('assignee', { length: 256 }),
  // ...add any other fields you want...
})

export const TaskInsertSchema = createInsertSchema(TableTasks).omit({
  id: true,
  uuid: true,
  createdAt: true,
  updatedAt: true,
})
export const TaskSelectSchema = createSelectSchema(TableTasks)

export type NewTaskRequest = z.infer<typeof TaskInsertSchema>
export type Task = typeof TableTasks.$inferSelect