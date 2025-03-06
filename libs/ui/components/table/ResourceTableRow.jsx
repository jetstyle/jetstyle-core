'use client'
import { Cell } from './cell'

export default function ResourceTableRow({
  resourceDescription,
  instance,
  actionsComponent= null,
  onEditButtonClick= null,
  apiPath= null,
  apiService= null,
  logsFunc= null,
}) {
  const ActionsComponent = actionsComponent

  return (
    <tr>
      {
        resourceDescription.props.map(prop => (
          <td key={prop.propName} >
            <Cell instance={instance} prop={prop} />
          </td>
        ))
      }
      {
        actionsComponent && <td>
          <ActionsComponent
            instance={instance}
            resourceDescription={resourceDescription}
            onEditButtonClick={onEditButtonClick}
            apiPath={apiPath}
            apiService={apiService}
            logsFunc={logsFunc}
          />
        </td>
      }
    </tr>
  )
}
