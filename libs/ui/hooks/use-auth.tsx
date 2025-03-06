'use client'

import { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

import useConfig from './useConfig'

import { navRoot, parseLocation } from '../helpers/nav'
import { fetchResource } from '../helpers/api'
import {
  type AuthTokens,
  type AuthLoadingState,
  getTokens,
  setRefreshToken,
} from '../helpers/auth'

type TAuthContext = {
  auth: AuthTokens | null
  setAuthState: React.Dispatch<React.SetStateAction<AuthTokens | null>> | null
  authLoadingState: AuthLoadingState
}

const AuthContext = createContext<TAuthContext>({
  auth: null,
  setAuthState: null,
  authLoadingState: 'loading'
})

const PAGES = {
  loginPage: '/login',
  signInPage: '/signup',
  mainPage: '/',
}

type TCheckProtectedUrl = (
  pathname: string,
  auth: AuthTokens | null,
  authLoadingState: AuthLoadingState
) => Promise<string | null>

type AuthProviderProps = {
  children: any
  checkProtectedUrl?: TCheckProtectedUrl
}

function getCurrentUrlWithoutRefreshToken() {
  const url = new URL(window.location.href)
  url.searchParams.delete('refreshToken')
  return url.toString()
}

export function AuthProvider({ children, checkProtectedUrl }: AuthProviderProps) {
  const [auth, setAuthState] = useState<AuthTokens | null>(null)
  const [authLoadingState, setAuthLoadingState] = useState<AuthLoadingState>('loading')
  const config = useConfig()

  const pathname = usePathname()
  const query = useSearchParams()
  const refreshTokenInQuery = query.get('refreshToken')
  const router = useRouter()
  const parsedLocation = useMemo(parseLocation, [pathname])

  const goToMain = () => {
    router.push(navRoot(parsedLocation, PAGES.mainPage))
  }

  const defaultCheckFunc = async (tokens: AuthTokens | null) => {
    const parsedLocation = parseLocation(pathname)
    const isLoginPage = (parsedLocation?.path === PAGES.loginPage)
    const isSignPage = (parsedLocation?.path === PAGES.signInPage)

    if (tokens === null) {
      // some auth error, redirect to login
      if (!isLoginPage && !isSignPage) {
        router.push(navRoot(parsedLocation, PAGES.loginPage))
        console.log('redirect to login')
      }
    } else {
      console.log('use-auth @ config', config)

      if (config?.auth?.permissions === 'tenant-based') {
        const tenant = await fetchResource<any>({
          apiService: 'auth',
          apiPath: `/tenants/by-name/${parsedLocation?.tenant}`,
        })

        console.log('use-auth @ tenant', tenant)

        if (tenant.err !== null) {
          // Redirect to another tenant
          const newLocation = {
            ...parsedLocation,
            tenant: tokens.parsedAccessToken.tenant
          }
          console.log('redirect to own tenant')
          router.push(navRoot(newLocation, PAGES.mainPage))
        } else {
          if (isLoginPage || isSignPage) {
            goToMain()
          }
        }
      } else {
        if (isLoginPage || isSignPage) {
          goToMain()
        }
      }
    }
  }

  const checkLoadingState = async () => {
    console.log('checkLoadingState: start')

    if (refreshTokenInQuery) {
      console.log('checkLoadingState: refresh token redirect')
      setRefreshToken(refreshTokenInQuery)
      window.location.href = getCurrentUrlWithoutRefreshToken()
      return
    }

    console.log('checkLoadingState: check tokens')
    let loadingState: AuthLoadingState
    const tokens = await getTokens()
    if (tokens) {
      loadingState = 'authorized'
      setAuthLoadingState(loadingState)
      setAuthState(tokens)
    } else {
      loadingState = 'not-authorized'
      setAuthLoadingState(loadingState)
    }

    if (checkProtectedUrl) {
      const redirectTo = await checkProtectedUrl(pathname, tokens, loadingState)
      if (redirectTo) {
        router.push(redirectTo)
      }
    } else {
      defaultCheckFunc(tokens)
    }
  }

  useEffect(() => {
    if (!config?.isReady) {
      return
    }
    checkLoadingState()
  }, [config?.isReady, pathname, refreshTokenInQuery])

  return (
    <AuthContext.Provider value={{ auth, setAuthState, authLoadingState }} >
      {children}
    </AuthContext.Provider>
  )
}

export default function useAuth() {
  const context = useContext(AuthContext)
  return context
}
