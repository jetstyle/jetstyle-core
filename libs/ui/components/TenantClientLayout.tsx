'use client'

import React, { ReactNode } from 'react'

import SideMenu from './SideMenu'
import useAuth from '../hooks/use-auth'
import { useUIState } from '../hooks/use-ui-state'

type TypeTenantClientLayout = {
    children?: ReactNode;
}

const TenantClientLayout = (props: TypeTenantClientLayout) => {
  const { children } = props
  const { isShowMenu } = useUIState()
  const { auth } = useAuth()

  let centerStyle = {}
  if (auth) {
    centerStyle = { marginLeft: isShowMenu ? ' 256px' : '110px' }
  }

  return (
    <section className="h-full">
      {auth && <SideMenu />}
      <section className="h-full"
        style={centerStyle}
      >
        {children}
      </section>
    </section>
  )
}

export default TenantClientLayout
