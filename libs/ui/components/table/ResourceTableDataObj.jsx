'use client'

import { useTranslations } from 'next-intl'
import React from 'react'

import ResourceTableRow from './ResourceTableRow'
import useFetch from '../../hooks/useFetch'

export default function ResourceTableDataObj({
  apiService,
  apiPath,
  resourceDescription,
  actionsComponent=null,
  onEditButtonClick=null,
}) {
  const t = useTranslations('Resource')
  const { data } = useFetch(apiPath, { apiService })

  return (
    <div>
      <div className="overflow-x-auto">

        <table className="table">
          <thead>
            <tr>
              {
                resourceDescription.props.map((prop) => (
                  <th key={prop.propName}>{t(prop.propName)}</th>
                ))
              }
              {
                actionsComponent && <th>{t('Actions')}</th>
              }
            </tr>
          </thead>
          <tbody>
            {data?.result && Object.keys(data?.result).map((result) => (data?.result[result] ? (
              <ResourceTableRow
                key={result}
                resourceDescription={resourceDescription}
                instance={{ ...data?.result[result], uuid: result }}
                actionsComponent={actionsComponent}
                onEditButtonClick={onEditButtonClick}
                apiPath={resourceDescription.apiPath}
                apiService={resourceDescription.apiService}
              />
            ) : null))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
