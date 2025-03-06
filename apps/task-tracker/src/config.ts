
export type TaskTrackerConfig = {
  port: number
  db: {
    host: string
    port: number
    username: string
    password: string
    database: string
    logging: boolean
    migrationsFolder: string
  }
}

export const config: TaskTrackerConfig = {
  port: process.env.TASK_TRACKER__PORT
    ? Number(process.env.TASK_TRACKER__PORT)
    : 8092,
  db: {
    host: process.env.PG__HOST ?? '0.0.0.0',
    port: process.env.PG__PORT ? Number(process.env.PG__PORT) : 5432,
    username: process.env.PG__USERNAME ?? '',
    password: process.env.PG__PASSWORD ?? '',
    database: process.env.PG__DATABASE ?? '',
    logging: process.env.PG__LOGGING === 'true',
    migrationsFolder: process.env.TASK_TRACKER__MIGRATIONS ?? './migrations',
  },
}