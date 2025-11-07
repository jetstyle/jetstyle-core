if (!process.env.AUTH__PUBLIC_KEY_URL) {
  throw new Error('Please provide AUTH__PUBLIC_KEY_URL')
}

export type ServerAuthConfig = {
  publicKeyCacheSeconds: number
  publicKeyUrl: string
  tenantBasedPermissions: boolean
  fullAccessScopes: Array<string>
}

const authSvcSelfUrl = process.env.AUTH_SVC__SELF_URL ?? 'http://localhost:8080'

const config: ServerAuthConfig = {
  publicKeyCacheSeconds: 60 * 60,
  publicKeyUrl: process.env.AUTH__PUBLIC_KEY_URL ?? `${authSvcSelfUrl}/auth/core/public-key`,
  tenantBasedPermissions: Boolean(process.env.AUTH__TENANT_PERMISSIONS === 'enabled'),
  fullAccessScopes: ['admin'],
}

export default config
