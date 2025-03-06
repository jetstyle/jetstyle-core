import 'dotenv/config'
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    host: process.env.PG__HOST ?? '0.0.0.0',
    port: process.env.PG__PORT ? Number(process.env.PG__PORT) : 5432,
    user: process.env.PG__USERNAME,
    password: process.env.PG__PASSWORD,
    database: process.env.PG__DATABASE,
  },
} satisfies Config;
