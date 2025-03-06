import React, { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import useAuth from '../hooks/use-auth'
import LogOut from './icons/LogOut'
import cn from 'classnames'
import { revokeRefreshToken } from './../helpers/auth'
import { navRoot, parseLocation } from './../helpers/nav'
import { usePathname, useRouter } from 'next/navigation'

type TypeLoggedUser = {
  isShowMenu: boolean
};

const LOGIN_PAGE = '/login'

const LoggedUserForCore: React.FC<TypeLoggedUser>  = ({
  isShowMenu
}) => {
  const t = useTranslations('Auth')

  const { auth, setAuthState } = useAuth()

  const colorPalette = ['#FF5733', '#33FF57', '#3357FF', '#FF3357', '#5733FF']
  const pathname = usePathname()
  const router = useRouter()
  const parsedLocation = useMemo(parseLocation, [pathname])
  const handleClick = () => {
    if (pathname) {
      const redirectTo = navRoot(parsedLocation, LOGIN_PAGE)
      router.push(redirectTo)
    } else {
      console.error('Ошибка: не удалось получить путь')
    }
  }

  if (!auth) {
    return (
      <div>
        <button onClick={handleClick} className="link"> {t('Login')}</button>
      </div>
    )
  }

  // TODO: Разобраться какие у нас обязательные поля в accessToken
  const userName = auth?.parsedAccessToken?.name
  const userEmail = auth?.parsedAccessToken?.email
  const letter = userName?.slice(0, 1) ?? 'U'

  const getHash = (str:any) => {
    let hash = 0
    for (let i = 0; i < str?.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash
  }
  const getColorIndex = (strId:string, colors:any) => {
    const hash = getHash(strId)
    return Math.abs(hash) % colors.length // Ensure the index is non-negative
  }
  const bgColor = colorPalette[getColorIndex(auth?.parsedAccessToken.sub, colorPalette)]

  const handleLogout = async () => {
    try {
      await revokeRefreshToken()
      if (setAuthState) {
        setAuthState(null)
      }
      const redirectTo = navRoot(parsedLocation, LOGIN_PAGE)
      router.push(redirectTo)

    } catch(err: any) {
      console.error('UserContext_logout_error', err)
    }
  }

  return (
    <div className={cn(!isShowMenu && 'flex justify-center')}>
      <div
        className={cn(isShowMenu && '', 'dropdown dropdown-hover dropdown-right dropdown-end w-fit')}
      >
        <div
          className={cn(isShowMenu && 'pr-2', 'flex items-center cursor-pointer')}
          style={{ justifyContent: !isShowMenu ? undefined : 'center', marginLeft: isShowMenu ? '16px' : undefined }}
          tabIndex={0} role="button"
        >
          <div className="avatar placeholder">
            <div className="text-base-100 rounded-full w-8"
              style={{ backgroundColor: bgColor }}
            >
              <span> {letter.toUpperCase()}</span>
            </div>
          </div>
          {
            isShowMenu &&
              <div>
                <div className='break-all text-xs ml-2'>{userName}</div>
                <div className='break-all text-xs ml-2 text-grey-neutral'>{userEmail}</div>
              </div>

          }
        </div>
        <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box w-52 p-2 shadow">
          <li>
            <div
              onClick={handleLogout}
            >
              <LogOut/>
              {t('Logout')}
            </div>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default LoggedUserForCore
