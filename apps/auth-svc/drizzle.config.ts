import 'dotenv/config'
import type { Config } from 'drizzle-kit'

export default {
  out: './drizzle',
  schema: './src/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.PG__URL ?? 'postgres:postgres@0.0.0.0:5445/postgres'
  },
} satisfies Config;
