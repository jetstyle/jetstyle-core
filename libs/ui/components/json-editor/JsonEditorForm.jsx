import React, { useState } from 'react'
import JsonEditor from '../json-editor/JSONEditor'
import { useTranslations } from 'next-intl'
import './style.scss'

const schema = {
  title: 'Example Schema',
  type: 'object',
  properties: {
    array: {
      type: 'array',
      items: {
        type: 'number'
      }
    },
    boolean: {
      type: 'boolean'
    },
    number: {
      type: 'number'
    }
  },
  required: ['array', 'string', 'boolean']
}

const modes = ['tree', 'form', 'view', 'code', 'text']

const JsonEditorForm = ({ text, setText }) => {
  const [mode, setMode] = useState('code')
  const [isShowView, setIsShowView] = useState(false)
  const tResource = useTranslations('Resource')

  const onChangeJSON = (json) => {
    const parsedData = JSON.parse(json)
    setText(JSON.stringify({ ...parsedData }, null, 2))
  }
  const updateTime = (e) => {
    e.stopPropagation()
    e.preventDefault()
    const time = new Date().toISOString()
    const parsedData = JSON.parse(text)
    setText(JSON.stringify({ ...parsedData, time }, null, 2))
  }

  const handleChangeViewing = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setIsShowView(!isShowView)

  }

  const onModeChange = (selectedMode) => {
    setMode(selectedMode)
  }

  return (
    <div>
      <div className="label">
        <span className="label-text">{tResource('json')}</span>
      </div>
      <div className='!rounded-lg'>
        <div className="contents">
          <div>
            <button className='btn btn-ghost btn-xs mb-2' onClick={updateTime}>
              {tResource('updateTime')}
            </button>
          </div>
          <JsonEditor
            onChangeText={onChangeJSON}
            schema={schema}
            text={text}
            mode={mode}
            modes={modes}
            indentation={4}
            onModeChange={onModeChange}
          />
          <button className=' btn btn-xs my-4' onClick={handleChangeViewing}>
            {
              isShowView
                ? <div className='viewing-btn down'>{tResource('no_view')}</div>
                : <div className='viewing-btn up'>{tResource('view')}</div>
            }
          </button>
          {
            isShowView &&
                        <div className="mt-4 border border-base-300 py-4 px-4">
                          <pre>
                            <code className='text-wrap'>
                              {text}
                            </code>
                          </pre>
                        </div>
          }
        </div>

      </div>

    </div>
  )
}

export default JsonEditorForm
