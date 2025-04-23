import { z } from '@hono/zod-openapi'
import { pgTable, serial, varchar, timestamp, text, jsonb } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

export const TableTasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  tenant: varchar('tenant', { length: 256 }).notNull(),

  status: varchar('status', {
    length: 256
  }).notNull(),
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description'),
  dueDate: timestamp('due_date'),
  priority: varchar('priority', { length: 256, enum: ['low', 'medium', 'high'] }),
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

type TaskStatuses = {
  statuses?: Array<string>
}

export const TableProjects = pgTable('projects', {
  id: serial('id').primaryKey(),
  uuid: varchar('uuid', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  tenant: varchar('tenant', { length: 256 }).notNull(),

  title: varchar('title', { length: 256 }).notNull(),
  taskStatuses: jsonb('task_statuses').$type<TaskStatuses>().default({}),
})

const taskStatusesSchema = z.object({
  statuses: z.array(z.string()).optional()
}).nullable().optional()

export const ProjectInsertSchema = createInsertSchema(TableProjects).omit({
  id: true,
  uuid: true,
  createdAt: true,
  updatedAt: true,
})
  .extend({
    taskStatuses: taskStatusesSchema
  })

export const ProjectSelectSchema = createSelectSchema(TableProjects)
  .extend({
    taskStatuses: taskStatusesSchema
  })

export type NewProjectRequest = z.infer<typeof ProjectInsertSchema>
export type Project = typeof TableProjects.$inferSelect