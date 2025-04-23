import 'dotenv/config'
import type { Config } from 'drizzle-kit'

if (!process.env.PG__USERNAME || !process.env.PG__PASSWORD || !process.env.PG__DATABASE) {
  throw new Error('Please provide postgres credentials for drizzle config')
}

export default {
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    host: process.env.PG__HOST ?? '0.0.0.0',
    port: process.env.PG__PORT ? Number(process.env.PG__PORT) : 5432,
    user: process.env.PG__USERNAME,
    password: process.env.PG__PASSWORD,
    database: process.env.PG__DATABASE,
  },
} satisfies Config
