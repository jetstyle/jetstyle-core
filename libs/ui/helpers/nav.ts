import { usePathname } from 'next/navigation'

const TENANT_SEGMENT = 'tenant'

export function parseLocation(url?: string) {
  const path = url ?? (typeof window !== 'undefined' ? window.location.pathname.toString() : '')
  const segments = path.split('/')
  const tenantPos = segments.indexOf(TENANT_SEGMENT)
  if (tenantPos == -1 || segments.length <= tenantPos) {
    return null
  }
  return {
    locale: segments[tenantPos - 1],
    tenant: segments[tenantPos + 1],
    tenantPos: tenantPos + 1,
    path: '/' + segments.slice(tenantPos + 2).join('/')
  }
}

export function getTenant() {
  return parseLocation()?.tenant ?? ''
}

export function createUri(abspath: string) {
  const parsed = parseLocation()

  if (!parsed) {
    return abspath
  }

  const newPath = abspath[0] === '/' ? abspath : `/${abspath}`
  return `/${parsed.locale}/${TENANT_SEGMENT}/${parsed.tenant}${newPath}`
}

export function useCreateUri() {
  const pathname = usePathname()
  const parsed = parseLocation(pathname ?? '')

  return (abspath: string) => {
    if (!parsed) {
      return abspath
    }

    const newPath = abspath[0] === '/' ? abspath : `/${abspath}`
    return `/${parsed.locale}/${TENANT_SEGMENT}/${parsed.tenant}${newPath}`
  }
}

export function parseLocationChats(url) {
  return parseLocation(url)
}

export function navRoot(parsedLocation, absPath) {
  return `/${parsedLocation.locale}/tenant/${parsedLocation.tenant}${absPath}`
}

export function navLevelUp(pathname) {
  const ind = pathname.lastIndexOf('/')
  if(ind >= 0) {
    return pathname.substring(0, ind)
  }
  return pathname
}

export function useNavLevelUp() {
  const pathname = usePathname()
  return navLevelUp(pathname)
}
