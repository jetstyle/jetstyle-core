# @jetstyle/server-start-proxy

Reusable HTTP + WebSocket start proxy to route local monorepo apps by path to ports.

Usage example (based on apps/start):

```ts
import dotenv from 'dotenv'
import { startServer, type StartProxyConfig } from '@jetstyle/server-start-proxy'

dotenv.config()

const routes: Record<string, number> = {
  '/': 3030,
  '/auth': 8091,
  '/file-server': 10241,
  '/task-tracker': 8092,
  '/chat-svc': 3060,
  '/resource': 10240,
}

const config: StartProxyConfig = {
  listenPort: process.env.START__PORT ? Number(process.env.START__PORT) : 8080,
  upstreamHost: process.env.START__UPSTREAM_HOST ?? '0.0.0.0',
  routes,
}

startServer(config)
```

Env variables:
- START__PORT — port to listen on (default 8080)
- START__UPSTREAM_HOST — host where upstream services are running (default 0.0.0.0)
