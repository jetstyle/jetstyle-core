export type RouteMatch = {
  basePath: string
  upstreamPort: number
  forwardPath: string
}

export function pickRoute(pathname: string, routes: Record<string, number>): RouteMatch | null {
  // Normalize
  const path = normalizePathname(pathname)

  // Longest prefix match
  let matchedBase: string | null = null
  let matchedPort: number | null = null
  for (const [base, port] of Object.entries(routes)) {
    const normBase = normalizeBase(base)
    if (path === normBase || path.startsWith(normBase + '/') || (normBase === '/' && path.startsWith('/'))) {
      if (matchedBase == null || normBase.length > matchedBase.length) {
        matchedBase = normBase
        matchedPort = port
      }
    }
  }

  if (!matchedBase || matchedPort == null) {return null}

  const forwardPath = path
  return { basePath: matchedBase, upstreamPort: matchedPort, forwardPath }
}

function normalizeBase(base: string): string {
  if (!base.startsWith('/')) {return '/' + base}
  if (base.length > 1 && base.endsWith('/')) {return base.slice(0, -1)}
  return base
}

function normalizePathname(pathname: string): string {
  if (!pathname.startsWith('/')) {return '/' + pathname}
  return pathname
}
