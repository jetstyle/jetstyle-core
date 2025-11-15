import { Pencil } from 'lucide-react'
import { useTranslations } from 'next-intl'
import React, { useContext } from 'react'

import { deleteResourceWithToken } from './../hooks/useFetch'
import ConfirmModal from './confirm-modal/ConfirmModal'
import Drawer from './Drawer'
import DeleteIcon from './icons/Delete'

const ShortActions = ({
  instance,
  resourceDescription,
  onRefresh = () => {},
  onEditButtonClick= null,
  apiPath= null,
  apiService= null,
}) => {
  const t = useTranslations('Form')
  const drawerContext = useContext(Drawer.Context)
  const uuidProp = resourceDescription.uuidProp ?? 'uuid'
  const onView = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if(onEditButtonClick) {
      onEditButtonClick(instance)
      drawerContext?.setShowFormFlag(true)
    }
  }

  const onDelete = () => {
    deleteResourceWithToken({
      apiService: apiService,
      apiPath: apiPath,
      resourceId: instance[uuidProp],
    })
      .then(onRefresh)
  }

  return (
    <div className="join">
      <label className="btn join-item btn-outline btn-sm w-10 rounded-lg" onClick={onView} >
        <Pencil />
      </label>
      {
        resourceDescription?.isCanDelete &&
                <ConfirmModal
                  title="Confirm"
                  description={t('AreYouSureQuestion')}
                  callbackFunction={onDelete}
                  confirm
                >
                  {confirm => (
                    <div>
                      <button className="btn join-item btn-outline btn-sm btn-error w-10 rounded-lg" onClick={confirm(onDelete)}><DeleteIcon /></button>
                    </div>
                  )}
                </ConfirmModal>
      }
    </div>
  )
}

export default ShortActions
