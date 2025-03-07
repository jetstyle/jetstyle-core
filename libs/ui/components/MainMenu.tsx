'use client'
import React, { ReactNode } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { Kanban } from 'lucide-react'

import useConfig from '../hooks/useConfig'
import { createUri } from '../helpers/nav'
import ProductsIcon from './icons/Products'
import SubscribersIcon from './icons/Subscribers'
import SettingsIcon from './icons/Settings'
import FolderIcon from './icons/Folder'
import ResultIcon from './icons/Result'
import MatchIcon from './icons/Match'
import RosterIcon from './icons/RosterIcon'
import ChallengeIcon from './icons/ChallengeIcon'
import MenuIcon from './icons/Menu'
import ChatsIcon from './icons/chats-icon'

type TypeMainMenu = {
  isShowMenu?: boolean ;
  children?: ReactNode;
};

const MainMenu: React.FC<TypeMainMenu>  = ({ children, isShowMenu=false }) => {
  const config = useConfig()
  const t = useTranslations('Menu')
  const pathname = usePathname()

  const renderIcon = (label:string) => {
    switch (label) {
    case 'Spaces':
      return <ProductsIcon/>
    case 'Files':
      return <FolderIcon width='16' height='16' />
    case 'Users':
    case 'Players':
      return <SubscribersIcon />
    case 'Agents':
      return <SettingsIcon />
    case 'Rosters':
    case 'Teams':
      return <RosterIcon />
    case 'Results':
      return <ResultIcon />
    case 'Challenges':
    case 'FootballPlayers':
      return <ChallengeIcon />
    case 'MatchMaking':
      return <MatchIcon />
    case 'Matches':
      return <MenuIcon />
    case 'Chats':
      return <ChatsIcon />
    case 'Tasks':
      return <Kanban />
    }
  }

  return (
    <ul className="menu bg-base-200 w-50 rounded-box pl-0"
      style={{ alignContent: isShowMenu ? undefined : 'center', }}
    >
      {
        config?.globalConfig?.navigation?.mainMenu?.map((item:any) => {
          return (
            <li key={item.path} className="mt-1 mb-1">
              <Link
                href={createUri(item.path)}
                className={pathname === createUri(item.path) ? 'active' : ''}
              >
                {renderIcon(item.label)}
                {isShowMenu && <div>{t(item.label)}</div>}
              </Link>
            </li>
          )
        })
      }
      {children}
    </ul>
  )
}
export default MainMenu
