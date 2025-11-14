import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useContext } from 'react'

import Drawer from './Drawer'
import FolderIcon from './icons/Folder'

export default function RootBreadcrumbs({ pathname }){
  const t = useTranslations('Files')
  const drawerContext = useContext(Drawer.Context)
  const onClickBreadcrumbs = () => {
    drawerContext?.setShowFormFlag(false)
  }
  return (
    <Link href={`${pathname}`}
      className='root flex items-center rounded-lg hover:bg-base-200 p-1  cursor-pointer'
      onClick={onClickBreadcrumbs}
    >
      <FolderIcon height='13' width='13'/>
      <span className='ml-[5px]'>{t('Files')}</span>
    </Link>
  )
}
