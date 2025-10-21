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
      const dbConn = (await import('../db.js')).getDbConnection()
      const { randomUUID } = await import('node:crypto')
      const { TableAuthCodes } = await import('../schema.js')
      const { config } = await import('../config.js')

      const body = c.req.valid('json') as { email: string }

      const users = await authServer.findUsersByEmail(body.email)
      if (!users || !users[0]) {
        return c.json({ err: 'user_not_found' }, 404)
      }
      const user = users[0]

      // generate 6-digit numeric code
      const code = Math.floor(100000 + Math.random() * 900000).toString()

      // store code
      try {
        await dbConn.insert(TableAuthCodes).values({
          uuid: randomUUID(),
          userId: user.uuid,
          code,
          bondTime: config.codeBondTime,
          liveTime: config.codeLiveTime
        })
      } catch (e: any) {
        return c.json({ err: 'code_issue_failed', errDescription: e?.toString?.() }, 500)
      }

      // placeholder sender
      console.log('[auth] send verification code to email:', body.email, 'code:', code)

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
