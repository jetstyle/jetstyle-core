import http from 'node:http'

import { ProxyEngine } from './proxy.js'
import type { StartProxyConfig } from './types.js'

export function startServer(cfg: StartProxyConfig) {
  const proxy = new ProxyEngine(cfg)

  const server = http.createServer(async (req, res) => {
    await proxy.handleHttp(req, res)
  })

  proxy.attachUpgrade(server)

  server.listen(cfg.listenPort, () => {
    // eslint-disable-next-line no-console
    console.log(`[start-proxy] listening on port ${cfg.listenPort}`)
  })

  return server
}
