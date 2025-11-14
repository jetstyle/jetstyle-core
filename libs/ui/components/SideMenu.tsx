'use client'
import cn from 'classnames'
import { useTranslations } from 'next-intl'
import React, { useEffect, useRef } from 'react'

import ArrowCollapse from './icons/ArrowCollapse'
import LoggedUser  from './LoggedUser'
import MainMenu from './MainMenu'
import ThemeController from './ThemeController'
import { useUIState } from '../hooks/use-ui-state'

type TSideMenuProps = {
  mainMenu?: any
  children?: any
};

const SideMenu = (props: TSideMenuProps) => {
  const { children } = props

  const t = useTranslations('App')
  const mainRef = useRef(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const { isShowMenu, setIsShowMenu } = useUIState()

  const EffectiveMainMenu: any = props.mainMenu ?? MainMenu

  useEffect(() => {
    setTimeout(() => {
      buttonRef.current?.focus()
    }, 10)
  }, [])

  const onCloseMenu = () => {
    setIsShowMenu(!isShowMenu)
    localStorage.setItem('featureIsShowMenu', isShowMenu ? 'false' : 'true')
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 flex h-full flex-col bg-base-200 p-6 shadow-sm z-[500]',
      )}
      style={{ width: isShowMenu ? ' 256px' : '110px' }}
      ref={mainRef}
    >
      <div className="mb-4 flex justify-center">
        <div className="flex items-center">
          <span className='ml-[9px]'>{t('name')}</span>
        </div>
      </div>
      <EffectiveMainMenu isShowMenu={isShowMenu} />
      {children}
      <div className='mt-auto'>
        <div className="mb-4 "
          style={{ display: isShowMenu ? 'flex' : '', marginLeft: isShowMenu ? '16px' : '' }}
        >
          <ThemeController/>
        </div>
        <button onClick={onCloseMenu} className='btn btn-ghost font-normal mb-4'>
          <div style={{ transform: !isShowMenu ? 'rotate(180deg)' : '' }}>
            <ArrowCollapse/>
          </div>
          {
            isShowMenu && <div>{t('collapse')}</div>
          }
        </button>
      </div>
      <LoggedUser isShowMenu={isShowMenu} />
    </aside>
  )
}
export default SideMenu
