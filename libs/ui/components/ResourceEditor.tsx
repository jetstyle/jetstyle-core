import ResourceDrawerForm from './resource-drawer-form/ResourceDrawerForm'
import { postResource, patchResource } from '../helpers/api'
import type { Resource } from '../types/types'
import { TypeResourceDescription } from '../types/file-manager'

type TResourceEditorProps = {
    instance?: Resource,

    resource?: string;
    resourceDescription: TypeResourceDescription

    // TODO: понять что это значит
    resourceDescriptionWithInstance?: TypeResourceDescription

    apiService?: string
    apiPath?: string
    onRefresh?: () => void

    dataToChange?: any
    setDataToChange?: any
}

export default function ResourceEditor(props: TResourceEditorProps) {
  const {
    resource,
    apiService,
    apiPath,
    resourceDescription,
    instance = null,
    dataToChange= null,
    setDataToChange= null,
    onRefresh = () => {},
  } = props
  const onSubmit = async (toSubmit) => {
    if (instance !== null) {
      patchResource({
        apiService,
        apiPath,
        toSubmit,
        resourceId: instance.uuid,
      }).then(onRefresh)
    } else {
      postResource({
        apiService,
        apiPath,
        toSubmit,
      }).then(onRefresh)
    }
  }

  return (
    <div>
      <ResourceDrawerForm
        resource={resource}
        resourceDescription={resourceDescription}
        instance={instance}
        onSubmit={onSubmit}
        dataToChange={dataToChange}
        setDataToChange={setDataToChange}
      />
    </div>
  )
}
