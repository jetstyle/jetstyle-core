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
