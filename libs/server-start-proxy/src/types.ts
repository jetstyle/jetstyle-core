export type StartProxyConfig = {
  listenPort: number
  upstreamHost: string
  routes: Record<string, number>
}
