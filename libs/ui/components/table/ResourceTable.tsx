'use client'

import { useTranslations } from 'next-intl'

import useFetch from '../../hooks/useFetch'
import ResourceTableRow from './ResourceTableRow'

export default function ResourceTable({
  apiService,
  apiPath,
  resourceDescription,
  actionsComponent=null,
  onEditButtonClick=null,
}) {
  const uuidProp = resourceDescription.uuidProp ?? 'uuid'
  const t = useTranslations('Resource')
  const { data } = useFetch<any>(apiPath, { apiService })

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              {
                resourceDescription.props.map((prop) => (
                  <th key={prop.propName} >{t(prop.propName)}</th>
                ))
              }
              {
                actionsComponent && <th>{t('Actions')}</th>
              }
            </tr>
          </thead>
          <tbody>
            {
              data?.result?.map((instance) => (
                <ResourceTableRow
                  key={instance[uuidProp]}
                  resourceDescription={resourceDescription}
                  instance={instance}
                  actionsComponent={actionsComponent}
                  onEditButtonClick={onEditButtonClick}
                  apiPath={apiPath}
                  apiService={apiService}
                />
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
