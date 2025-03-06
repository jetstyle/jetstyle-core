import React, { useState } from 'react'

import CloseIcon from './icons/Close'
import cn from 'classnames'

const DrawerContext = React.createContext()

export default function Drawer({
  drawerId='',
  children
}) {
  const [isShowForm, setShowFormFlag] = useState(false)
  const drawerRealId = drawerId ?? 'drawer-checkbox:' + Math.random().toString()

  return (
    <DrawerContext.Provider value={{ drawerId: drawerRealId, isShowForm, setShowFormFlag }}>
      <div className="drawer drawer-end">
        <input
          id={drawerRealId}
          type="checkbox"
          className="drawer-toggle"
          checked={isShowForm}
          onChange={(e) => setShowFormFlag(e.target.checked)}
        />
        {children}
      </div>
    </DrawerContext.Provider>
  )
};

function DrawerContent({ children }) {
  return (
    <div className="drawer-content">
      {children}
    </div>
  )
}

function DrawerSide({ children, style = 'w-80' }) {
  const { drawerId, isShowForm } = React.useContext(DrawerContext)

  return (
    <div
      className={cn('drawer-side overflow-x-hidden overflow-y-hidden z-30')}
    >
      <div
        className={cn(style, 'relative p-4 min-h-full bg-base-200')}
      >
        <div className="absolute">
          <label htmlFor={drawerId}
            aria-label="close sidebar"
          ><CloseIcon/></label>
        </div>
        {isShowForm && children}
      </div>
    </div>
  )
}

Drawer.Context = DrawerContext
Drawer.Content = DrawerContent
Drawer.Side = DrawerSide
