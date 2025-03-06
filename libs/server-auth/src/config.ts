if (!process.env.AUTH__PUBLIC_KEY_URL) {
  throw new Error('Please provide AUTH__PUBLIC_KEY_URL')
}

type BasicHttpAuthAccount = {
  username: string
  password: string
}

export type ServerAuthConfig = {
  publicKeyCacheSeconds: number
  publicKeyUrl: string
  tenantBasedPermissions: boolean
  fullAccessScopes: Array<string>
  fullAccessBasicAccounts: Array<BasicHttpAuthAccount>
}

const config: ServerAuthConfig = {
  publicKeyCacheSeconds: 60 * 60,
  publicKeyUrl: process.env.AUTH__PUBLIC_KEY_URL,
  tenantBasedPermissions: Boolean(process.env.AUTH__TENANT_PERMISSIONS === 'enabled'),
  fullAccessScopes: ['admin'],
  fullAccessBasicAccounts: []
}

if (process.env.AUTH__BASIC_ACCOUNTS) {
  const list = process.env.AUTH__BASIC_ACCOUNTS.split(',')
  for (const item of list) {
    const creds = item.split(':')
    if (creds.length > 1 && creds[0] && creds[1]) {
      config.fullAccessBasicAccounts.push({
        username: creds[0],
        password: creds[1]
      })
    }
  }
}

export default config