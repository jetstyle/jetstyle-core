"use client"

import { useTranslations } from 'next-intl'
import { useMemo, useState } from "react"
import useTenant from "@jetstyle/ui/hooks/useTenant";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {navRoot, parseLocation} from "@jetstyle/ui/helpers/nav";
import useAuth from '@jetstyle/ui/hooks/use-auth'
import { postResource } from '@jetstyle/ui/helpers/api'
import { type AuthTokenResponse, setAccessToken, setRefreshToken } from '@jetstyle/ui/helpers/auth'

const MAIN_PAGE = '/tasks'
const SIGNIN_PAGE = '/signup'


export default function LoginPage() {
  const t = useTranslations('Auth')
  const { auth } = useAuth()

  console.log('login @ auth', auth)

  const tenant = useTenant()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const parsedLocation = useMemo(parseLocation, [pathname])

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    tenant: ''
  })

  const [error, setError] = useState<string | null>(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      tenant: tenant,
      [name]: value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const username = formData.username
    const password = formData.password

    const result = await postResource<AuthTokenResponse>({
      apiService: 'auth',
      apiPath: '/core/login',
      toSubmit: {
        email: username,
        username,
        password,
      },
    })

    console.log('login result', result)

    if (result.err !== null) {
      setError(t(result.err))
      return
    }

    onOk(result.value.accessToken, result.value.refreshToken)
  }

  const onOk = async (accessToken: string, refreshToken?: string) => {
    console.log('@ accessToken', accessToken)

    if (refreshToken) {
      setRefreshToken(refreshToken)
    }

    const tokensResult = setAccessToken(accessToken)
    console.log('@ tokensResult', tokensResult)

    if (tokensResult.err !== null) {
      setError(t(tokensResult.err))
      return
    }

    const forceRedirectTo = searchParams.get('redirect_to')
    if (forceRedirectTo) {
      console.log('forceRedirectTo', forceRedirectTo)
      router.push(forceRedirectTo)
      return
    }

    const redirectTo = navRoot(parsedLocation, MAIN_PAGE)
    router.push(redirectTo)
  }

  const handleClick = () => {
    if (pathname) {
      const redirectTo = navRoot(parsedLocation, SIGNIN_PAGE)
      router.push(redirectTo)
    } else {
      console.error('Ошибка: не удалось получить путь');
    }
  }

  // TODO: Вынести вёрстку в отдельный компонент LoginForm
  return (
    <>
      {/*{(loading || accessToken) ? <div></div> :*/}
      {auth ? <div></div> :
        <div className="flex justify-center items-center h-full bg-base-150">
          <div className="flex flex-col items-center">
            <div className="card w-96 shadow-2xl bg-base-200">
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">{t('Username')}</span>
                    </label>
                    <input
                      type="username"
                      name="username"
                      className="input input-bordered"
                      value={formData.username}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">{t('Password')}</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      className="input input-bordered"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  {error && <div className="text-red-500 mt-2">{error}</div>}
                  <div className="form-control mt-6">
                    <button type="submit" className="btn btn-primary">
                      {t('Login')}
                    </button>
                  </div>

                </form>
                <div className="mt-4">
                  {t('AlreadyNotHaveAccount')}
                  <button onClick={handleClick} className="link"> {t('Register')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </>
  )
}
