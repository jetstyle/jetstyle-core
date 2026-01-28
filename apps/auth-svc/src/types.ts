import type { TResult } from '@jetstyle/utils'

export type AuthMethod = 'username-password'
  | 'email-password'
  | 'email-opt'
  | 'phone-opt'
  | 'permanent-link'
  | 'magic-link'
  | 'github'

export type SMSSender = {
  sendSms(phone: string, text: string, extra?: { code: string }): Promise<TResult<boolean>>
}

export type EmailSender = {
  sendEmail(email: string, text: string, extra?: { code: string }): Promise<TResult<boolean>>
}

export type AuthServerConfig = {
  port: number
  authMethods: Array<AuthMethod>
  authSvcSelfUrl: string
  privateKey: string
  publicKey: string
  jwtLiveTime: string
  jwtForgery: {
    activationStatus: 'active' | 'disabled'
  },
  allowedRegistrationDomains: Array<string>
  issuer: string
  audience: string
  isSecureCookie: boolean
  cookieLiveTime: number
  codeLiveTime: number
  codeBondTime: number
  password: {
    saltRounds: number
  },
  db: {
    host: string
    port: number
    username: string
    password: string
    database: string
    logging: boolean
    migrationsFolder: string
    ssl?: string
  },
  adminTenant?: string
  adminPassword?: string
  masterCode?: string
}
