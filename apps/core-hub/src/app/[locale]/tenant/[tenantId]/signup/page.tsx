"use client"

import { useTranslations } from 'next-intl'
import { useMemo, useState } from "react";
import useTenant from "@jetstyle/ui/hooks/useTenant";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { type AuthTokenResponse, setAccessToken, setRefreshToken } from '@jetstyle/ui/helpers/auth'
import {navRoot, parseLocation} from "@jetstyle/ui/helpers/nav";
import useAuth from '@jetstyle/ui/hooks/use-auth'
import { postResource } from '@jetstyle/ui/helpers/api'
import useConfig from '@jetstyle/ui/hooks/useConfig';

const MAIN_PAGE = '/tasks'
const LOGIN_PAGE = '/login'

export default function OnSigninPage() {
  const t = useTranslations('Auth')
  const tenant = useTenant()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const parsedLocation = useMemo(parseLocation, [pathname])

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    tenant: ''
  })

  const [error, setError] = useState<string | null>(null)

  const { auth } = useAuth()
  const config = useConfig()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      tenant: tenant,
      [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const result = await postResource<AuthTokenResponse>({
      apiService: 'auth',
      apiPath: '/core/register',
      toSubmit: formData,
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
      const redirectTo = navRoot(parsedLocation, LOGIN_PAGE)
      router.push(redirectTo)
    } else {
      console.error('Ошибка: не удалось получить путь');
    }
  }

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
                      <span className="label-text">{t('Name')}</span>
                    </label>
                    <input
                      type="firstName"
                      name="firstName"
                      className="input input-bordered"
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">{t('LastName')}</span>
                    </label>
                    <input
                      type="lastName"
                      name="lastName"
                      className="input input-bordered"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  </div>
                  {config?.auth?.allowUsernameRegistration && <div className="form-control">
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
                  </div>}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">{t('Email')}</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="input input-bordered"
                      value={formData.email}
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
                      {t('Register')}
                    </button>
                  </div>

                </form>
                <div className="mt-4">
                  {t('AlreadyHaveAccount')}
                  <button onClick={handleClick} className="link"> {t('Login')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </>
  )
}
