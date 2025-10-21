
import { randomUUID, getRandomValues } from 'node:crypto'

import { z } from '@hono/zod-openapi'
import bcrypt from 'bcrypt'
import { eq, asc, and } from 'drizzle-orm'
import { importPKCS8, importSPKI, SignJWT, exportSPKI } from 'jose'
import type { KeyLike } from 'jose'

import type { Permission, TAccessTokenPayload } from '@jetstyle/server-auth'
import { collectAllUserTenantPermissions } from './model/permissions.js'
import { TResult, Err, Ok } from '@jetstyle/utils'

import { getDbConnection } from './db.js'
import type { DB } from './db.js'
import type {
  Tenant,
  User,
  NewUserRequest,
  AuthCode
} from './schema.js'
import {
  TableUsers,
  TableRefreshTokens,
  TableTenants,
  TableAuthCodes,
  TableBasicAuthAccounts,
} from './schema.js'
import type { AuthServerConfig } from './types.js'

export const LoginSchema = z.object({
  username: z.string().optional(),
  email: z.string().optional(),
  password: z.string()
})

export const CodeLoginSchema = z.object({
  code: z.string()
})

export type LoginRequest = z.infer<typeof LoginSchema>

export type CodeLoginRequest = z.infer<typeof CodeLoginSchema>

export type Tokens = {
  accessToken: string
  refreshToken: string
}

export type UserWithTokens = {
  user: User
  accessToken: string
  refreshToken: string
}

type SMSSender = {
  sendSms(phone: string, text: string): TResult<boolean>
}

type EmailSender = {
  sendEmail(email: string, text: string): TResult<boolean>
}

type NewUserWithPassword = {
  tenant: string
  password: string
} & NewUserRequest

export class AuthServer {

  private privateKey: KeyLike | null = null
  private publicKey: KeyLike | null = null

  constructor(
    public db: DB,
    public config: AuthServerConfig,
    public smsSender?: SMSSender,
    public emailSender?: EmailSender
  ) {
    this.loadKeysFromConfig().catch((err) => {
      console.error('Ошибка при загрузке ключей:', err)
    })
  }

  async registerUser(newUser: NewUserRequest): Promise<TResult<User>> {
    if (!newUser.password) {
      return Err('password_required')
    }

    if (
      this.config.authMethods.indexOf('email-password') === -1
      && this.config.authMethods.indexOf('username-password') === -1
    ) {
      return Err('no_password_auth_methods')
    }

    if (
      this.config.authMethods.indexOf('email-password') === -1 && !newUser.username
      || this.config.authMethods.indexOf('username-password') === -1 && !newUser.email
      || !newUser.email && !newUser.username
    ) {
      return Err('email_or_username_required')
    }

    if (newUser.email) {
      if (this.config.allowedRegistrationDomains && this.config.allowedRegistrationDomains.length > 0) {
        console.log('this.config.allowedRegistrationDomains', this.config.allowedRegistrationDomains)

        let isDomainInWhiteList = false
        for (const domainHost of this.config.allowedRegistrationDomains) {
          const domain = `@${domainHost}`
          if (newUser.email.indexOf(domain) > -1) {
            isDomainInWhiteList = true
            break
          }
        }
        if (!isDomainInWhiteList) {
          return Err('domain_is_not_allowed')
        }
      }

      const users = await this.findUsersByEmail(newUser.email)
      if (users && users.length > 0) {
        return Err('email_already_registered')
      }
    }

    if (newUser.username) {
      const users = await this.findUsersByUsername(newUser.username)
      if (users && users.length > 0) {
        return Err('username_already_registered 1')
      }
    }

    const passwordResult = await this.hashPassword(newUser.password)
    if (passwordResult.err !== null) {
      return passwordResult
    }
    const password = passwordResult.value
    const result = await this.createUser({
      ...newUser,
      password,
    })

    if (result.err !== null) {
      return result
    }

    if (result.value.email) {
      const users = await this.findUsersByEmail(result.value.email)
      if (users !== null) {
        const isRemoved = await this.removeDuplicatedRecords(users, result.value.uuid)
        if (isRemoved) {
          return Err('email_already_registered')
        }
      }
    }
    if (result.value.username) {
      const users = await this.findUsersByUsername(result.value.username)
      if (users !== null) {
        const isRemoved = await this.removeDuplicatedRecords(users, result.value.uuid)
        if (isRemoved) {
          return Err('username_already_registered')
        }
      }
    }

    return result
  }

  async loadKeysFromConfig() {
    const privateKeyPem = Buffer.from(this.config.privateKey, 'base64').toString('utf8')
    this.privateKey = await importPKCS8(privateKeyPem, 'RS256')

    const publicKeyPem = Buffer.from(this.config.publicKey, 'base64').toString('utf8')
    this.publicKey = await importSPKI(publicKeyPem, 'RS256')
  }

  async loginByPassword(data: LoginRequest): Promise<TResult<UserWithTokens>> {
    if (
      !data.email && !data.username
      || this.config.authMethods.indexOf('email-password') === -1 && !data.username
      || this.config.authMethods.indexOf('username-password') === -1 && !data.email
    ) {
      return Err('email_or_username_required')
    }

    let user: User | null = null
    if (data.username) {
      const result = await this.findUsersByUsername(data.username)
      if (result !== null && result[0]) {
        user = result[0]
      }
    }
    if (!user && data.email) {
      const result = await this.findUsersByEmail(data.email)
      if (result !== null && result[0]) {
        user = result[0]
      }
    }

    if (!user) {
      return Err('user_not_found')
    }

    if (!user.password) {
      return Err('auth_by_password_unavailable_for_user')
    }

    const passwordResult = await this.comparePassword(data.password, user.password)
    if (passwordResult.err !== null) {
      return passwordResult
    }

    if (!passwordResult.value) {
      return Err('password_mismatch')
    }

    const tokensResult = await this.generateTokens(user)
    if (tokensResult.err !== null) {
      return tokensResult
    }

    return Ok({
      user,
      accessToken: tokensResult.value.accessToken,
      refreshToken: tokensResult.value.refreshToken
    })
  }

  async loginByCode(data: CodeLoginRequest): Promise<TResult<Tokens>> {
    if (!data.code) {
      return Err('auth_code_required')
    }

    const authCode = await this.getAuthCode(data.code)
    if (!authCode) {
      return Err('auth_code_mismatch')
    }
    if (authCode.liveTime > Date.now()) {
      return Err('auth_code_expired')
    }

    const user = await this.getUserById(authCode.userId)
    if (!user) {
      return Err('user_not_found')
    }

    const tokensResult = await this.generateTokens(user)
    if (tokensResult.err !== null) {
      return tokensResult
    }

    return Ok({
      accessToken: tokensResult.value.accessToken,
      refreshToken: tokensResult.value.refreshToken
    })
  }

  async generateAccessToken(user: User): Promise<TResult<string>> {
    if (!this.privateKey) {
      console.error('Private key is not initialized!')
      return Err('private_key_not_initialized')
    }

    const tenant = await this.getTenant(user.tenant)
    console.log('authServer @ tenant', tenant)

    // Create the JWT payload with OpenID standard claims + custom attributes
    let tenants = await collectAllUserTenantPermissions(user)
    // ownership fallback: if user has a tenant and no binds exist for it, grant default 'view'
    if (user.tenant && tenants[user.tenant] === undefined) {
      tenants = { ...tenants, [user.tenant]: ['view'] }
    }

    const jwtPayload: TAccessTokenPayload & { tenants: Record<string, Array<string>> } = {
      sub: user.uuid,
      name: this.getUserFullName(user),
      iss: this.config.issuer,
      aud: this.config.audience,

      tenant: user.tenant,
      ...tenant && { tpy: tenant.tenantType },
      ...user.email && { email: user.email },
      ...user.username && { username: user.username },

      scopes: (user.scopes && user.scopes.length > 0) ? user.scopes : [],
      tenants, // new field: { [tenantName]: Array<string> }
    }

    const accessToken = await new SignJWT(jwtPayload)
      // .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime(`${this.config.jwtLiveTime}`)
      .sign(this.privateKey)

    return Ok(accessToken)
  }

  async generateTokens(user: User): Promise<TResult<Tokens>> {
    if (!this.privateKey) {
      console.error('Private key is not initialized!')
      return Err('private_key_not_initialized')
    }

    const accessTokenResult = await this.generateAccessToken(user)
    if (accessTokenResult.err !== null) {
      return accessTokenResult
    }

    const accessToken = accessTokenResult.value
    // Generate the opaque refresh token
    const refreshToken = this.generateRefreshToken()

    // Store refresh token to be able to restore user from it
    try {
      await this.db.insert(TableRefreshTokens)
        .values({
          uuid: randomUUID().toString(),
          token: refreshToken,
          userId: user.uuid,
          loginStatus: 'active',
        })

    } catch(e) {
      return Err('unknown_error', e?.toString())
    }

    return Ok({ accessToken, refreshToken })
  }

  async getUserByRefreshToken(refreshToken: string): Promise<TResult<User | null>> {
    const tokens = await this.db.select()
      .from(TableRefreshTokens)
      .where(
        and(
          eq(TableRefreshTokens.token, refreshToken),
          eq(TableRefreshTokens.loginStatus, 'active'),
        )
      )

    if (!tokens || tokens.length === 0 || !tokens[0]) {
      return Ok(null)
    }

    const token = tokens[0]
    const userId = token.userId

    const users = await this.db.select()
      .from(TableUsers)
      .where(eq(TableUsers.uuid, userId))

    if (users.length > 0 && users[0]) {
      return Ok(users[0])
    }

    return Ok(null)
  }

  async logout(refreshToken: string) {
    await this.db.update(TableRefreshTokens)
      .set({ loginStatus: 'logged-out' })
      .where(eq(TableRefreshTokens.token, refreshToken))
  }

  generateRefreshToken(): string {
    const randomBytes = getRandomValues(new Uint8Array(32))
    return Array.from(randomBytes, (byte) => ('0' + byte.toString(16)).slice(-2)).join('')
  }

  async removeDuplicatedRecords(users: Array<User>, myId: string): Promise<boolean> {
    for (let i = 1; i < users.length; i++) {
      const user = users[i]
      if (user && user.uuid === myId) {
        await this.db.delete(TableUsers).where(eq(TableUsers.uuid, myId))
      }
    }
    return false
  }

  async getOrCreateByPhone(tenant: string, phone: string): Promise<TResult<User>> {
    const users = await this.findUsersByPhone(phone)
    if (users !== null && users[0]) {
      return Ok(users[0])
    }

    const result = await this.createUser({ tenant, phone })
    if (result.err !== null) {
      return result
    }

    const createdUsers = await this.findUsersByPhone(phone)
    if (createdUsers === null || !createdUsers[0]) {
      return Err('user_not_created')
    }

    await this.removeDuplicatedRecords(createdUsers, result.value.uuid)
    return Ok(createdUsers[0])
  }

  async getOrCreateByEmail(tenant: string, email: string): Promise<TResult<User>> {
    const users = await this.findUsersByEmail(email)
    if (users !== null && users[0]) {
      return Ok(users[0])
    }

    const result = await this.createUser({ tenant, email })
    if (result.err !== null) {
      return result
    }

    const createdUsers = await this.findUsersByEmail(email)
    if (createdUsers === null || !createdUsers[0]) {
      return Err('user_not_created')
    }

    await this.removeDuplicatedRecords(createdUsers, result.value.uuid)
    return Ok(createdUsers[0])
  }

  getUserFullName(user: User): string {
    const parts: Array<string> = []
    if (user.firstName) {
      parts.push(user.firstName)
    }
    if (user.lastName) {
      parts.push(user.lastName)
    }
    if (parts.length === 0) {
      if (user.username) {
        parts.push(user.username)
      } else if (user.email) {
        parts.push(user.email)
      } else {
        parts.push('Anonymous')
      }
    }
    return parts.join(' ')
  }

  async findUsersByEmail(email: string): Promise<Array<User> | null>{
    const users = await this.db.select()
      .from(TableUsers)
      .where(eq(TableUsers.email, email))
      .orderBy(asc(TableUsers.id))

    if (users.length > 0) {
      return users
    }
    return null
  }

  async getTenant(name: string): Promise<Tenant | null> {
    const tenants = await this.db.select()
      .from(TableTenants)
      .where(eq(TableTenants.name, name))
      .orderBy(asc(TableTenants.id))
      .limit(1)

    if (tenants.length > 0 && tenants[0]) {
      return tenants[0]
    }
    return null
  }

  async findUsersByUsername(username: string): Promise<Array<User> | null>{
    const users = await this.db.select()
      .from(TableUsers)
      .where(eq(TableUsers.username, username))
      .orderBy(asc(TableUsers.id))

    if (users.length > 0) {
      return users
    }
    return null
  }

  async findUsersByPhone(phone: string): Promise<Array<User> | null>{
    const users = await this.db.select()
      .from(TableUsers)
      .where(eq(TableUsers.phone, phone))
      .orderBy(asc(TableUsers.id))

    if (users.length > 0) {
      return users
    }
    return null
  }

  async createUser(newUser: NewUserRequest): Promise<TResult<User>> {
    const result = await this.db.insert(TableUsers)
      .values({
        ...newUser,
        uuid: this.genUUID()
      })
      .returning()

    if (result.length > 0 && result[0]) {
      console.log('User created:', result[0])
      return Ok(result[0])
    }
    console.log('Error inserting user')
    return Err('unknown_insert_error')
  }

  async createUserWithPassword(newUser: NewUserWithPassword) {
    const passwordResult = await this.hashPassword(newUser.password)
    if (passwordResult.err !== null) {
      return passwordResult
    }
    const password = passwordResult.value
    const result = await this.createUser({
      ...newUser,
      password,
    })

    return result
  }

  async getUserById(userId: string): Promise<User| null> {
    const users = await this.db.select()
      .from(TableUsers)
      .where(eq(TableUsers.uuid, userId))

    if (users.length > 0 && users[0]) {
      return users[0]
    }
    return null
  }

  async updateUserById(){}

  genUUID() {
    return `user_${randomUUID()}`
  }

  async hashPassword(password: string): Promise<TResult<string>> {
    try {
      const hashed = await bcrypt.hash(password, this.config.password.saltRounds)
      return Ok(hashed)
    } catch(err: any) {
      return Err('password_hashing_error', err.toString())
    }
  }

  async comparePassword(password: string, hash: string): Promise<TResult<boolean>> {
    try {
      const result = await bcrypt.compare(password, hash)
      return Ok(result)
    } catch(err: any) {
      return Err('password_checking_hash_error', err.toString())
    }
  }

  async getAuthCode(authCode: string): Promise<AuthCode | null> {
    const db = getDbConnection()
    const codes = await db.select()
      .from(TableAuthCodes)
      .where(eq(TableAuthCodes.code, authCode))

    if (codes.length > 0 && codes[0]) {
      return codes[0]
    }
    return null
  }

  async getPublicKey(): Promise<string | ''> {
    if (this.publicKey) {
      return exportSPKI(this.publicKey)
    }
    return ''
  }
}

export async function getTenantByName(name: string): Promise<Tenant | null> {
  const db = getDbConnection()
  const tenants = await db.select()
    .from(TableTenants)
    .where(eq(TableTenants.name, name))
    .orderBy(asc(TableTenants.id))
    .limit(1)

  if (tenants.length > 0 && tenants[0]) {
    return tenants[0]
  }
  return null
}

export async function getTenantByOwner(userId: string): Promise<Tenant | null> {
  const db = getDbConnection()
  const tenants = await db.select()
    .from(TableTenants)
    .where(eq(TableTenants.ownerUserId, userId))
    .orderBy(asc(TableTenants.id))
    .limit(1)

  if (tenants.length > 0 && tenants[0]) {
    return tenants[0]
  }
  return null
}

export async function getChildTenants(parentTenantName: string): Promise<Array<Tenant> | null> {
  const db = getDbConnection()
  const tenants = await db.select()
    .from(TableTenants)
    .where(eq(TableTenants.parentTenantName, parentTenantName))
    .orderBy(asc(TableTenants.id))

  if (tenants.length > 0) {
    return tenants
  }
  return null
}

// <<<--- new basic auth account helper funcs, probably should be moved elsewhere --->>>

export async function getBasicAuthAccountByLogin(login: string) {
  const db = getDbConnection()
  const accounts = await db.select()
    .from(TableBasicAuthAccounts)
    .where(eq(TableBasicAuthAccounts.login, login))
    .limit(1)

  return accounts[0] ?? null
}

export async function incrementLoginAttempt(uuid: string, attempts: number) {
  const db = getDbConnection()
  await db.update(TableBasicAuthAccounts)
    .set({ loginAttempts: attempts + 1 })
    .where(eq(TableBasicAuthAccounts.uuid, uuid))
}

export async function resetLoginAttempt(uuid: string) {
  const db = getDbConnection()
  await db.update(TableBasicAuthAccounts)
    .set({
      loginAttempts: 0,
      lastLoginAt: new Date()
    })
    .where(eq(TableBasicAuthAccounts.uuid, uuid))
}

// export async function lockBasicAuthAccount(uuid: string) {
//   const db = getDbConnection()
//   await db.update(TableBasicAuthAccounts)
//     .set({ status: 'disabled' })
//     .where(eq(TableBasicAuthAccounts.uuid, uuid))
// }

const MAX_ATTEMPTS = 5

export async function getPermissionsByBasicAuthV2(basicAuthHeader: string): Promise<Permission> {
  if (!basicAuthHeader) {
    return { level: 'denied', tenants: [] }
  }

  const [type, credentials] = basicAuthHeader.split(' ')
  if (type !== 'Basic' || !credentials) {
    return { level: 'denied', tenants: [] }
  }
  const decoded = Buffer.from(credentials, 'base64').toString('utf-8')
  const [login, password] = decoded.split(':')
  if (!login || !password) {
    return { level: 'denied', tenants: [] }
  }

  const account = await getBasicAuthAccountByLogin(login)
  if (!account) {
    return { level: 'denied', tenants: [] }
  }
  if (account.status !== 'active') {
    return { level: 'denied', tenants: [] }
  }
  if (account.loginAttempts >= MAX_ATTEMPTS) {
    // await lockBasicAuthAccount(account.uuid)
    return { level: 'denied', tenants: [] }
  }

  const isValidPassword = await bcrypt.compare(password, account.passwordHash)
  if (!isValidPassword) {
    await incrementLoginAttempt(account.uuid, account.loginAttempts)
    return { level: 'denied', tenants: [] }
  }

  await resetLoginAttempt(account.uuid)

  return { level: 'denied', tenants: [] }
}
