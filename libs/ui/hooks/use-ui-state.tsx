'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type TUIStateContext = {
  isShowMenu: boolean
  setIsShowMenu: React.Dispatch<React.SetStateAction<boolean>>
}

const UIStateContext = createContext<TUIStateContext | null>(null)

export function UIStateProvider({ children }: { children: ReactNode }) {
  const [isShowMenu, setIsShowMenu] = useState(false)

  useEffect(() => {
    const showMenuStorage = localStorage.getItem('featureIsShowMenu')
    if (showMenuStorage === 'true') {
      setIsShowMenu(true)
    }
  }, [])

  const value = {
    isShowMenu,
    setIsShowMenu,
  }

  return (
    <UIStateContext.Provider value={value}>
      {children}
    </UIStateContext.Provider>
  )
}

export function useUIState() {
  const context = useContext(UIStateContext)
  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider')
  }
  return context
}