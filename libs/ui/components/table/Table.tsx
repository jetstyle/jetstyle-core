import { useTranslations } from 'next-intl'

import { Cell } from './cell'
import styles from './Table.module.scss'
import React from 'react'

import { TypeCustomFolders, TypeResourceDescription, TypeResourceItem } from './../../types/file-manager'

type TTableRowProps = {
  instance: any
  resourceDescription: TypeResourceDescription
  iconComponent: any
  onRefresh: any
  onRowClick: any
  onEditButtonClick: any
  rootPath: any
  enterTheRow: any
  gettingDataWithTokens: any
  customFolders: any
  actionsComponent: any
}

export function TableRow(props: TTableRowProps) {
  const {
    resourceDescription,
    instance,
    actionsComponent = null,
    iconComponent = null,
    onRefresh,
    onRowClick,
    onEditButtonClick,
    gettingDataWithTokens = false,
    customFolders = null
  } = props
  const ActionsComponent = actionsComponent
  const IconComponent = iconComponent

  let onClick
  if (onRowClick) {
    onClick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      onRowClick(instance)
    }
  }

  return (
    <tr
      className={styles.row}
      onClick={onClick}
    >
      {
        iconComponent && <td className="w-4">
          <IconComponent
            instance={instance}
            resourceDescription={resourceDescription}
            customFolders={customFolders}
          />
        </td>
      }
      {
        resourceDescription.props.map(prop => (
          <td key={prop.propName} >
            <Cell instance={instance} prop={prop} />
          </td>
        ))
      }
      {
        actionsComponent && <td
          className='actions z-20 sticky -right-px bg-base-100 hover:bg-base-200 '
        >
          <ActionsComponent
            instance={instance}
            resourceDescription={resourceDescription}
            onRefresh={onRefresh}
            onEditButtonClick={onEditButtonClick}
            gettingDataWithTokens={gettingDataWithTokens}
          />
        </td>
      }
    </tr>
  )
}

interface TypeTableProps {
  resourceDescription: TypeResourceDescription;
  dataList?: TypeResourceItem[]| null;
  actionsComponent?: any;
  iconComponent?: any;
  onRowClick?: (row: any) => void;
  onEditButtonClick?: ((row: any) => void) | null;
  onRefresh?: () => void;
  rootPath?: any;
  enterTheRow?: boolean;
  gettingDataWithTokens?: boolean;
  customFolders?: TypeCustomFolders | any;
}

const Table: React.FC<TypeTableProps>  = ({
  resourceDescription,
  dataList=[],
  actionsComponent=null,
  iconComponent=null,
  onRowClick,
  onEditButtonClick,
  onRefresh,
  rootPath=null,
  enterTheRow=false,
  gettingDataWithTokens=false,
  customFolders=null,
}) => {
  const uuidProp = resourceDescription.uuidProp ?? 'uuid'
  const t = useTranslations('Resource')
  return (
    <div className="overflow-x-auto h-[85vh]">
      <table className="table table-pin-rows">
        <thead>
          <tr>
            {
              iconComponent && <td></td>
            }
            {
              resourceDescription.props.map((prop) => (
                <th key={prop.propName} >{t(prop.propName)}</th>
              ))
            }
            {
              actionsComponent && <th className='z-20 sticky -right-px bg-base-100'>{t('Actions')}</th>
            }
          </tr>
        </thead>
        <tbody>
          {
            dataList && dataList?.map((instance) => (
              <TableRow
                key={instance[uuidProp]}
                resourceDescription={resourceDescription}
                instance={instance}
                actionsComponent={actionsComponent}
                onRefresh={onRefresh}
                iconComponent={iconComponent}
                onRowClick={onRowClick}
                onEditButtonClick={onEditButtonClick}
                rootPath={rootPath}
                enterTheRow={enterTheRow}
                gettingDataWithTokens={gettingDataWithTokens}
                customFolders={customFolders}
              />
            ))
          }
        </tbody>
      </table>
    </div>
  )
}

export default Table
