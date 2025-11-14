import { useState, useEffect } from 'react'

import { fetchResourceById } from '../helpers/api'
import type { PresenterProps } from '../types/types'

export default function Presenter({ instance, prop, options }: PresenterProps) {
  const entityId = instance[prop.propName]
  const [entity, setEntity] = useState<any | null>(null)

  const propName = options?.propName ?? 'name'

  useEffect(() => {
    if (!entityId || !options) {
      return
    }
    fetchResourceById({
      apiService: options.apiService,
      apiPath: options.apiPath,
      uuid: entityId,
    })
      .then((result) => {
        if (result.err === null) {
          setEntity(result.value)
        }
      })
  }, [entityId])

  if (!entityId) {
    return <div></div>
  }
  if (!entity || !entity[propName]) {
    return <div>{entityId}</div>
  }
  return (
    <div>
      <div>{entity[propName]}</div>
      <div className="text-xs text-gray-500 mt-2" >{entityId}</div>
    </div>
  )
}
