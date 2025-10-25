import type http from 'node:http'

import { Pool } from 'undici'
import { WebSocketServer, WebSocket } from 'ws'

import { pickRoute } from './router.js'
import type { StartProxyConfig } from './types.js'

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  // "host" is not hop-by-hop, but we want undici to set it
  'host',
])

export class ProxyEngine {
  private config: StartProxyConfig
  private pools = new Map<string, Pool>()
  private wsServer: WebSocketServer

  constructor(config: StartProxyConfig) {
    this.config = config
    this.wsServer = new WebSocketServer({ noServer: true })
  }

  attachUpgrade(server: http.Server) {
    server.on('upgrade', (req, socket, head) => this.handleUpgrade(req, socket, head))
  }

  async handleHttp(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const url = new URL(req.url ?? '/', 'http://placeholder')
      const match = pickRoute(url.pathname, this.config.routes)
      if (!match) {
        res.statusCode = 404
        res.end('Not Found')
        return
      }

      const origin = `http://${this.config.upstreamHost}:${match.upstreamPort}`
      const pool = this.getPool(origin)

      const controller = new AbortController()
      req.on('aborted', () => controller.abort())

      const headers = filterHeaders(req.headers)

      const upstreamRes: any = await pool.request({
        origin,
        path: match.forwardPath + url.search,
        method: (req.method || 'GET') as any,
        headers,
        body: getRequestBody(req) as any,
        signal: controller.signal as any,
      })

      res.statusCode = upstreamRes.statusCode
      // Copy headers except hop-by-hop
      for (const [name, value] of Object.entries(upstreamRes.headers)) {
        if (value == null) {continue}
        if (HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {continue}
        // Node expects string | number | string[]; undici may give string | string[]
        res.setHeader(name, value as any)
      }

      upstreamRes.body.on('error', (e: any) => {
        // If client aborted or upstream aborted, just end silently
        if (isAbortLikeError(e)) {
          try { res.end() } catch { ignoreError() }
          return
        }
        // eslint-disable-next-line no-console
        console.error('Proxy response stream error:', e)
        if (!res.headersSent) {
          res.statusCode = 502
        }
        try { res.end() } catch { ignoreError() }
      })

      upstreamRes.body.pipe(res)
    } catch (err: any) {
      // Swallow abort-like errors quietly; this is a normal situation when client disconnects
      if (isAbortLikeError(err)) {
        try { if (!res.writableEnded) {res.end()} } catch { ignoreError() }
        return
      }
      // eslint-disable-next-line no-console
      console.error('Proxy error:', err)
      if (!res.headersSent) {
        res.statusCode = 502
      }
      try { res.end('Bad Gateway') } catch { ignoreError() }
    }
  }

  handleUpgrade(req: http.IncomingMessage, socket: any, head: Buffer) {
    try {
      const url = new URL(req.url ?? '/', 'http://placeholder')
      const match = pickRoute(url.pathname, this.config.routes)
      if (!match) {
        socket.destroy()
        return
      }

      this.wsServer.handleUpgrade(req, socket, head, (clientWs) => {
        const upstreamUrl = `ws://${this.config.upstreamHost}:${match.upstreamPort}${match.forwardPath}${url.search}`
        const protocols = getRequestedProtocols(req)
        const upstreamHeaders = filterHeaders(req.headers)
        const upstreamWs = new WebSocket(upstreamUrl, protocols, { headers: upstreamHeaders })

        // Wire traffic both ways
        clientWs.on('message', (data, isBinary) => {
          if (upstreamWs.readyState === WebSocket.OPEN) {
            upstreamWs.send(data, { binary: isBinary })
          }
        })
        upstreamWs.on('message', (data, isBinary) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data, { binary: isBinary })
          }
        })

        // Close propagation with safe validation
        const closeBoth = (code?: number, reason?: Buffer | string) => {
          const safe = normalizeWsCloseArgs(code, reason)
          if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CLOSING) {
            safeWsClose(clientWs, safe.code, safe.reason)
          }
          if (upstreamWs.readyState === WebSocket.OPEN || upstreamWs.readyState === WebSocket.CLOSING) {
            safeWsClose(upstreamWs, safe.code, safe.reason)
          }
        }

        clientWs.on('close', (code, buf) => closeBoth(code, buf))
        upstreamWs.on('close', (code, buf) => closeBoth(code, buf))

        clientWs.on('error', () => closeBoth(1011))
        upstreamWs.on('error', () => closeBoth(1011))
      })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('WS upgrade error:', err)
      socket.destroy()
    }
  }

  private getPool(origin: string): Pool {
    let pool = this.pools.get(origin)
    if (!pool) {
      pool = new Pool(origin, {
        connections: 128,
        pipelining: 1,
        keepAliveTimeout: 60_000,
      })
      this.pools.set(origin, pool)
    }
    return pool
  }
}

function getRequestedProtocols(req: http.IncomingMessage): string | Array<string> | undefined {
  const h = req.headers['sec-websocket-protocol']
  return h
}

function getRequestBody(req: http.IncomingMessage) {
  const method = (req.method || 'GET').toUpperCase()
  if (method === 'GET' || method === 'HEAD') {return undefined}
  return req
}

function filterHeaders(headers: http.IncomingHttpHeaders): http.IncomingHttpHeaders {
  const res: http.IncomingHttpHeaders = {}
  for (const [k, v] of Object.entries(headers)) {
    if (!v) {continue}
    if (HOP_BY_HOP_HEADERS.has(k.toLowerCase())) {continue}
    res[k] = v
  }
  return res
}

// Treat AbortError / abort-like errors as normal flow
function isAbortLikeError(err: any): boolean {
  if (!err) {return false}
  const name = (err.name || err.code || '').toString()
  const msg = (err.message || '').toString().toLowerCase()
  // undici uses DOMException AbortError; Node may set code=ABORT_ERR
  return name === 'AbortError' || name === 'ABORT_ERR' || msg.includes('aborted') || msg.includes('aborted the operation')
}

function ignoreError(): void {
  // intentionally ignore
  return
}

// WebSocket close helpers
function isValidWsCloseCode(code: any): code is number {
  if (typeof code !== 'number') {return false}
  if (code === 1004 || code === 1005 || code === 1006) {return false}
  return code >= 1000 && code <= 4999
}

function normalizeWsCloseArgs(code?: number, reason?: Buffer | string): { code?: number; reason?: string } {
  let finalCode: number | undefined = isValidWsCloseCode(code) ? code : 1000
  let finalReason: string | undefined
  if (typeof reason === 'string') {
    finalReason = reason
  } else if (reason && Buffer.isBuffer(reason)) {
    // Ensure max 123 bytes per RFC, fallback to simple label
    finalReason = reason.subarray(0, 123).toString('utf8')
  } else if (reason != null) {
    finalReason = String(reason)
  }
  if (finalReason && Buffer.byteLength(finalReason) > 123) {
    finalReason = finalReason.slice(0, 123)
  }
  return { code: finalCode, reason: finalReason }
}

function safeWsClose(ws: WebSocket, code?: number, reason?: string) {
  try {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CLOSING) {
      // ws.close tolerates undefined code; we always pass a valid one
      ws.close(code, reason)
    }
  } catch {
    // swallow
  }
}
