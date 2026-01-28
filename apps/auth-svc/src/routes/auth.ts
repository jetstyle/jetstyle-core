import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import {
  getCookie,
  deleteCookie,
} from 'hono/cookie'

import { ErrRespValidator } from '@jetstyle/hono-drizzle-tools'

import {
  LoginSchema,
  CodeLoginSchema
} from '../model.js'
import {
  UserInsertSchema,
  UserSelectSchema
} from '../schema.js'

const app = new OpenAPIHono()

export const authRoutes = app.openapi(
  createRoute({
    method: 'post',
    tags: ['Auth'],
    path: '/register',
    description: 'To allow users to sign up and create an account.',
    request: {
      body: {
        description: 'Created user',
        content: {
          'application/json': {
            schema: UserInsertSchema
          }
        }
      },
    },
    responses: {
      200: {
        description: 'Result',
        content: {
          'application/json': {
            schema: z.object({
              user: UserSelectSchema,
              accessToken: z.string(),
              refreshToken: z.string(),
            })
          }
        }
      },
      400: {
        description: 'Malformed request',
        content: {
          'application/json': {
            schema: ErrRespValidator
          }
        }
      },
      500: {
        description: 'Unexpected error',
        content: {
          'application/json': {
            schema: ErrRespValidator
          }
        }
      },
    }
  }),
  async (c) => {
    const authServer = c.get('authServer')
    const data = c.req.valid('json')

    // TODO: pass device info for registerUser

    const result = await authServer.registerUser(data)
    if (result.err !== null) {
      return c.json(result, 400)
    }

    const user = result.value
    const tokensResult = await authServer.generateTokens(user)
    if (tokensResult.err !== null) {
      return c.json(tokensResult, 500)
    }

    return c.json({
      user: result.value,
      accessToken: tokensResult.value.accessToken,
      refreshToken: tokensResult.value.refreshToken,
    }, 200)
  })
  .openapi(
    createRoute({
      method: 'post',
      tags: ['Auth'],
      path: '/register/request-code',
      description: 'Issues a numeric verification code for a user identified by email. Placeholder sender logs the code. Intended for post-registration verification step.',
      request: {
        body: {
          description: 'Request a verification code',
          content: {
            'application/json': {
              schema: z.object({
                email: z.string().email()
              })
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Code has been issued',
          content: {
            'application/json': {
              schema: z.object({
                status: z.string()
              })
            }
          }
        },
        404: {
          description: 'User not found',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
        500: {
          description: 'Unexpected error',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        }
      }
    }),
    async (c) => {
      const authServer = c.get('authServer')
      const body = c.req.valid('json')

      const users = await authServer.findUsersByEmail(body.email)
      if (!users || !users[0]) {
        return c.json({ err: 'user_not_found' }, 404)
      }
      const user = users[0]

      const codeResult = await authServer.createNumericAuthCode(user.uuid)
      if (codeResult.err !== null) {
        return c.json(codeResult, 500)
      }

      const code = codeResult.value

      if (authServer.emailSender) {
        const sendResult = await authServer.emailSender.sendEmail(
          body.email,
          `Your verification code: ${code}`,
          { code },
        )
        if (sendResult.err !== null) {
          console.warn('[auth] failed to send verification email', sendResult.err)
        }
      } else {
        console.log('[auth] send verification code to email:', body.email, 'code:', code)
      }

      return c.json({ status: 'ok' }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'post',
      tags: ['Auth'],
      path: '/register/verify',
      description: 'Verifies a numeric code for a user by email. Supports MASTER code from ENV that always passes.',
      request: {
        body: {
          description: 'Verify code',
          content: {
            'application/json': {
              schema: z.object({
                email: z.string().email(),
                code: z.string()
              })
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Tokens',
          content: {
            'application/json': {
              schema: z.object({
                accessToken: z.string(),
                refreshToken: z.string()
              })
            }
          }
        },
        400: {
          description: 'Malformed request',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
        404: {
          description: 'User not found',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        }
      }
    }),
    async (c) => {
      const authServer = c.get('authServer')
      const { email, code } = c.req.valid('json') as { email: string; code: string }
      const { config } = await import('../config.js')

      const users = await authServer.findUsersByEmail(email)
      if (!users || !users[0]) {
        return c.json({ err: 'user_not_found' }, 404)
      }
      const user = users[0]

      // MASTER code bypass
      if (config.masterCode && code === config.masterCode) {
        const tokens = await authServer.generateTokens(user)
        if (tokens.err !== null) {
          return c.json(tokens, 400)
        }
        return c.json({
          accessToken: tokens.value.accessToken,
          refreshToken: tokens.value.refreshToken,
        }, 200)
      }

      // fallback to code login using provided code
      const result = await authServer.loginByCode({ code })
      if (result.err !== null) {
        return c.json(result, 400)
      }
      return c.json({
        accessToken: result.value.accessToken,
        refreshToken: result.value.refreshToken,
      }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'post',
      tags: ['Auth'],
      path: '/password/email/request-code',
      description: 'Issues a password change confirmation code for a user identified by email.',
      request: {
        body: {
          description: 'Request a password change confirmation code',
          content: {
            'application/json': {
              schema: z.object({
                email: z.string().email()
              })
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Code has been issued',
          content: {
            'application/json': {
              schema: z.object({
                status: z.string()
              })
            }
          }
        },
        404: {
          description: 'User not found',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
        400: {
          description: 'Password change is unavailable for the user',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
        500: {
          description: 'Failed to issue a code',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        }
      }
    }),
    async (c) => {
      const authServer = c.get('authServer')
      const body = c.req.valid('json') as { email: string }

      const users = await authServer.findUsersByEmail(body.email)
      if (!users || !users[0]) {
        return c.json({ err: 'user_not_found' }, 404)
      }

      const user = users[0]
      if (!user.password) {
        return c.json({ err: 'auth_by_password_unavailable_for_user' }, 400)
      }

      const codeResult = await authServer.createNumericAuthCode(user.uuid)
      if (codeResult.err !== null) {
        return c.json(codeResult, 500)
      }

      const code = codeResult.value

      if (authServer.emailSender) {
        const sendResult = await authServer.emailSender.sendEmail(
          body.email,
          `Your password change code: ${code}`,
          { code },
        )
        if (sendResult.err !== null) {
          console.warn('[auth] failed to send password change email', sendResult.err)
        }
      } else {
        console.log('[auth] send password change code to email:', body.email, 'code:', code)
      }

      return c.json({ status: 'ok' }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'post',
      tags: ['Auth'],
      path: '/password/email/confirm',
      description: 'Updates password for an email-password user after code confirmation.',
      request: {
        body: {
          description: 'Confirm password change request',
          content: {
            'application/json': {
              schema: z.object({
                email: z.string().email(),
                code: z.string(),
                newPassword: z.string().min(8)
              })
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Password has been updated',
          content: {
            'application/json': {
              schema: z.object({
                status: z.string()
              })
            }
          }
        },
        400: {
          description: 'Malformed request or invalid code',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
        404: {
          description: 'User not found',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        }
      }
    }),
    async (c) => {
      const authServer = c.get('authServer')
      const body = c.req.valid('json')

      const users = await authServer.findUsersByEmail(body.email)
      if (!users || !users[0]) {
        return c.json({ err: 'user_not_found' }, 404)
      }

      const user = users[0]
      if (!user.password) {
        return c.json({ err: 'auth_by_password_unavailable_for_user' }, 400)
      }

      const codeValidation = await authServer.verifyAuthCodeForUser(user.uuid, body.code)
      if (codeValidation.err !== null) {
        if (codeValidation.err === 'auth_code_mismatch') {
          return c.json(codeValidation, 400)
        }
        if (codeValidation.err === 'auth_code_expired' || codeValidation.err === 'auth_code_not_ready') {
          return c.json(codeValidation, 400)
        }
        return c.json(codeValidation, 400)
      }

      const updateResult = await authServer.updateUserPassword(user.uuid, body.newPassword)
      if (updateResult.err !== null) {
        return c.json(updateResult, 400)
      }

      await authServer.consumeAuthCode(codeValidation.value.uuid)

      return c.json({ status: 'ok' }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'post',
      tags: ['Auth'],
      path: '/password/username/change',
      description: 'Updates password for a username-password user after validating the current password.',
      request: {
        body: {
          description: 'Change password using username and current password',
          content: {
            'application/json': {
              schema: z.object({
                username: z.string(),
                currentPassword: z.string(),
                newPassword: z.string().min(8)
              })
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Password has been updated',
          content: {
            'application/json': {
              schema: z.object({
                status: z.string()
              })
            }
          }
        },
        400: {
          description: 'Malformed request or password change unavailable',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
        403: {
          description: 'Current password mismatch',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
        404: {
          description: 'User not found',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        }
      }
    }),
    async (c) => {
      const authServer = c.get('authServer')
      const body = c.req.valid('json') as { username: string; currentPassword: string; newPassword: string }

      const users = await authServer.findUsersByUsername(body.username)
      if (!users || !users[0]) {
        return c.json({ err: 'user_not_found' }, 404)
      }

      const user = users[0]
      if (!user.password) {
        return c.json({ err: 'auth_by_password_unavailable_for_user' }, 400)
      }

      const passwordCheck = await authServer.comparePassword(body.currentPassword, user.password)
      if (passwordCheck.err !== null) {
        return c.json(passwordCheck, 400)
      }

      if (!passwordCheck.value) {
        return c.json({ err: 'password_mismatch' }, 403)
      }

      const updateResult = await authServer.updateUserPassword(user.uuid, body.newPassword)
      if (updateResult.err !== null) {
        return c.json(updateResult, 400)
      }

      return c.json({ status: 'ok' }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'post',
      tags: ['Auth'],
      path: '/login',
      description: 'Authenticates the user by password',
      request: {
        body: {
          description: 'Result',
          content: {
            'application/json': {
              schema: LoginSchema
            }
          }
        },
      },
      responses: {
        200: {
          description: 'A User',
          content: {
            'application/json': {
              schema: z.object({
                // user: UserSelectSchema,
                accessToken: z.string(),
                refreshToken: z.string(),
              })
            }
          }
        },
        400: {
          description: 'Malformed request',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
        403: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
        404: {
          description: 'User not found',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
      }
    }),
    async (c) => {
      const authServer = c.get('authServer')
      const body = c.req.valid('json')
      const result = await authServer.loginByPassword(body)
      if (result.err !== null) {
        if (result.err === 'user_not_found') {
          return c.json(result, 404)
        }
        if (result.err === 'password_mismatch') {
          return c.json(result, 403)
        }
        return c.json(result, 400)
      }

      return c.json({
        accessToken: result.value.accessToken,
        refreshToken: result.value.refreshToken,
      }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'post',
      tags: ['Auth'],
      path: '/login/code',
      description: 'Authenticates the user by otp code',
      request: {
        body: {
          description: 'Result',
          content: {
            'application/json': {
              schema: CodeLoginSchema
            }
          }
        },
      },
      responses: {
        200: {
          description: 'Tokens',
          content: {
            'application/json': {
              schema: z.object({
                accessToken: z.string(),
                refreshToken: z.string(),
              })
            }
          }
        },
        400: {
          description: 'Malformed request',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
      }
    }),
    async (c) => {
      const authServer = c.get('authServer')
      const body = c.req.valid('json')
      const result = await authServer.loginByCode(body)
      if (result.err !== null) {
        return c.json(result, 400)
      }

      return c.json({
        accessToken: result.value.accessToken,
        refreshToken: result.value.refreshToken,
      }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'post',
      tags: ['Auth'],
      path: '/token',
      description: 'Allows users to refresh their JWT token if it\'s expired or about to expire.',
      request: {
        body: {
          description: 'Result',
          content: {
            'application/json': {
              schema: z.object({
                refreshToken: z.string()
              })
            }
          }
        },
      },
      responses: {
        200: {
          description: 'Token',
          content: {
            'application/json': {
              schema: z.object({
                accessToken: z.string()
              })
            }
          }
        },
        401: {
          description: 'Not authorized',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        },
        500: {
          description: 'Unexpected error',
          content: {
            'application/json': {
              schema: ErrRespValidator
            }
          }
        }
      }
    }),
    async (c) => {
      const authServer = c.get('authServer')
      const body = c.req.valid('json')

      const refreshToken = body.refreshToken ?? getCookie(c, 'refreshToken')

      console.log('@ refreshToken', refreshToken)

      if (!refreshToken) {
        return c.json({ err: 'no_refresh_token' }, 401)
      }

      const userResp = await authServer.getUserByRefreshToken(refreshToken)
      if (userResp.err !== null) {
        return c.json(userResp, 500)
      }
      const user = userResp.value

      if (!user) {
        return c.json({ err: 'not_authorized' }, 401)
      }

      const accessTokenResult = await authServer.generateAccessToken(user)
      if (accessTokenResult.err !== null) {
        return c.json(accessTokenResult, 500)
      }

      const accessToken = accessTokenResult.value

      return c.json({ accessToken }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'post',
      tags: ['Auth'],
      path: '/logout',
      request: {
        body: {
          description: 'Result',
          content: {
            'application/json': {
              schema: z.object({
                refreshToken: z.string()
              })
            }
          }
        },
      },
      responses: {
        200: {
          description: 'Successfully logged out',
          content: {
            'application/json': {
              schema: z.object({
                status: z.string()
              })
            }
          }
        },
      }
    }),
    async (c) => {
      const authServer = c.get('authServer')
      const refreshToken = getCookie(c, 'refreshToken')
      if (refreshToken) {
        authServer.logout(refreshToken)
      }
      deleteCookie(c, 'refreshToken')

      // TODO: mark refreshToken from body

      return c.json({ status: 'ok' }, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'get',
      tags: ['Auth'],
      path: '/public-key',
      responses: {
        200: {
          description: 'Public key to verify authorization',
          content: {
            'text/plain': {
              schema: z.string()
            }
          }
        },
      }
    }),
    async (c) => {
      const authServer = c.get('authServer')
      const publicKey = await authServer.getPublicKey()
      return c.text(publicKey, 200)
    }
  )
  .openapi(
    createRoute({
      method: 'get',
      tags: ['Auth'],
      path: '/health',
      responses: {
        200: {
          description: 'Health endpoint',
          content: {
            'application/json': {
              schema: z.object({
                status: z.string()
              })
            }
          }
        },
      }
    }),
    async (c) => {
      return c.json({ status: 'ok' }, 200)
    }
  )
