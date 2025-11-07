import dotenv from 'dotenv'

import type { AuthServerConfig } from './types.js'

dotenv.config()

export const config: AuthServerConfig = {
  port: 8091,
  authMethods: ['username-password', 'email-password'],
  authSvcSelfUrl: process.env.AUTH_SVC__SELF_URL ?? 'http://localhost:8080',
  privateKey: process.env.AUTH_SVC__PRIVATE_KEY ?? '',
  publicKey: process.env.AUTH_SVC__PUBLIC_KEY ?? '',
  jwtLiveTime: process.env.AUTH_SVC__JWT_TTL ?? '525949min',  // year in minutes oO
  jwtForgery: {
    activationStatus: 'disabled'
  },
  issuer: 'com.jetstyle.auth',
  audience: 'com.jetstyle.api',
  isSecureCookie: false,
  cookieLiveTime: 60 * 60 * 24 * 400, // 400 дней
  codeLiveTime: 1000 * 60 *10,        // 10 мин (TODO - 4 testing - update to real value)
  codeBondTime: 1000 * 60 *10,        // 10 мин (TODO - 4 testing - update to real value)
  password: {
    saltRounds: 11,
  },
  db: {
    host: process.env.PG__HOST ?? '0.0.0.0',
    port: process.env.PG__PORT ? Number(process.env.PG__PORT) : 5432,
    username: process.env.PG__USERNAME ?? '',
    password: process.env.PG__PASSWORD ?? '',
    database: process.env.PG__DATABASE ?? '',
    logging: (process.env.PG__LOGGING === 'true' || process.env.PG__LOGGING === 'enabled'),
    migrationsFolder: process.env.AUTH_SVC__MIGRATIONS ?? 'core/apps/auth-svc/drizzle',
  },
  allowedRegistrationDomains: [],
  adminTenant: process.env.AUTH__ADMIN_TENANT ?? 'platform',
  adminPassword: process.env.AUTH__ADMIN_PASSWORD ?? 'change-me',
  masterCode: process.env.AUTH_SVC__MASTER_CODE
}

if (process.env.AUTH__ALLOWED_REGISTRATION_DOMAINS) {
  const domains = process.env.AUTH__ALLOWED_REGISTRATION_DOMAINS.split(',')
    .filter(Boolean)
  config.allowedRegistrationDomains = domains
}
