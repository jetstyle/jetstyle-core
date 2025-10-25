'use client'
import { useTranslations } from 'next-intl'
import Drawer from './Drawer'
import ResourceTable from './table/ResourceTable'
import Actions from './actions'
import ResourceEditor from './ResourceEditor'
import { useState } from 'react'

export default function ResourcePage({
  resourceDescription,
  modalWightSize= null,
}) {
  const t = useTranslations('Resource')

  const [dataToChange, setDataToChange] = useState(null)
  const drawerId = 'my-drawer-spaces'
  const customWight = [
    {
      text: 'wight50',
      value: 'w-[50%]'
    }
  ]

  const modalWight = customWight.map(item => modalWightSize === item.text ? item.value : 'w-80')

  const handleAddOperator = () => {
    setDataToChange(null)
  }
  const onEditButtonClick = (instance) => {
    setDataToChange(instance)
  }

  return (
    <Drawer drawerId={drawerId} >
      <Drawer.Content>
        <main>
          <section className="p-6">
            <div className="navbar bg-base-100">
              <div className="navbar-start">
                <span className="text-3xl">{t(resourceDescription?.listName)}</span>
              </div>
              <div className="navbar-end">
                <label htmlFor={drawerId} onClick={handleAddOperator} className="btn btn-primary" >{t('Add')}</label>
              </div>
            </div>
          </section>
          <ResourceTable
            apiService={resourceDescription?.apiService}
            apiPath={resourceDescription?.apiPath}
            resourceDescription={resourceDescription}
            actionsComponent={Actions}
            onEditButtonClick={onEditButtonClick}
          />
        </main>
      </Drawer.Content>
      <Drawer.Side
        style = {modalWight}
      >
        <ResourceEditor
          instance={dataToChange}
          apiService={resourceDescription?.apiService}
          apiPath={resourceDescription?.apiPath}
          resource={resourceDescription?.name}
          resourceDescription={resourceDescription}

          dataToChange={dataToChange}
          setDataToChange={setDataToChange}
        />
      </Drawer.Side>
    </Drawer>
  )
}