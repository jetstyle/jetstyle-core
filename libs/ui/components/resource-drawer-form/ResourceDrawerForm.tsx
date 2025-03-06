'use client'
import React, { useContext, useState, useRef, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
const _ = require('lodash')
import Drawer from '../Drawer'
import CloseIcon from '../icons/Close'
import JsonEditorForm from '../json-editor/JsonEditorForm'
import { Tiptap } from '../tiptap/Tiptap'
import cn from 'classnames'
import  './style.scss'

import scrollStyles from '../../styles/styles.module.scss'

import { translit } from '../../models/helpers'
import { ARCHIVE_MIME_TYPES } from '../../models/descriptions'

import useTenant from '../../hooks/useTenant'
import { TypeResourceDescription, TypeResourceItem } from '../../types/file-manager'
import { propsToValues } from '../../helpers/forms'
import MultiChoice from '../multi-choice'

type TypeResourceDrawerFormProps = {
  resource?: string | null;
  dataToChange?: TypeResourceItem | null;
  setDataToChange?: React.Dispatch<React.SetStateAction<TypeResourceItem | null>>;
  setFileDragged?: React.Dispatch<React.SetStateAction<File[] | null>>;
  resourceDescription: TypeResourceDescription;
  instance?: any;
  onSubmit?: any;
  onCancel?: any;
  fileDragged?:any;
  listOfJson?: boolean;
  whatToAdd?: string;
  setErrorFromApi?: any;
  errorFromApi?: string | null;
}

export const MAXIMUM_SIZE = 1000 * 1024 * 1024 // In MegaBytes - 1000mb

function ResourceInput({ prop, onChange, loadedFile, setLoadedFile, valueToChange, isShowUnzipCheckbox, setShowUnzipCheckbox }) {
  const t = useTranslations('Resource')

  let input:any = null
  const [inputValue, setInputValue] = useState<string|null>(null)
  const [inputValueEmpty, setInputValueEmpty] = useState(true)

  useEffect(() => {
    if (loadedFile && inputValueEmpty && prop.propName === 'displayName') {
      setInputValue( loadedFile?.name)
    }
    if (loadedFile && inputValueEmpty && prop.propName === 'name') {
      const changedName:string = translit(loadedFile?.name)
      setInputValue(changedName)
    }
    else if (valueToChange) {
      const propName = prop.nameFromApi ?? prop.propName
      const val =  _.get(valueToChange, propName)
      setInputValue(val || '')
      setInputValueEmpty(false)
    }
  }, [loadedFile])

  const onChangeValue = (e) => {
    e.preventDefault()
    const name = e.target.name
    const value = e.target.value
    const files = e.target.files
    setInputValue(e.target.value)

    if(value.trim() === '') {
      setInputValueEmpty(true)
    } else {
      setInputValueEmpty(false)
    }

    onChange(name, value, files)
  }

  const onChangeValueCheckbox = (e) => {
    e.preventDefault()
    const name = e.target.name
    const value = e.target.checked

    const files = undefined
    setInputValue(value)

    onChange(name, value, files)
  }

  if (prop.propType === 'string') {
    input = (
      <input
        name={prop.propName}
        value={(valueToChange || loadedFile) && inputValue}
        type="text"
        className="input input-bordered w-full max-w-xs"
        onChange={(e) => onChangeValue(e)}
        disabled={valueToChange && prop.nameFromApi === 'path'}
      />
    )
  } else if (prop.propType === 'number') {
    input = (
      <input
        min={'0'}
        name={prop.propName}
        value={(valueToChange || loadedFile) && inputValue}
        type="number"
        className="input input-bordered w-full max-w-xs"
        onChange={(e) => onChangeValue(e)}
        disabled={valueToChange && prop.nameFromApi === 'path'}
      />
    )
  }
  else if (prop.propType === 'boolean') {
    input = (
      <input
        type="checkbox"
        className="checkbox"
        value={(valueToChange) && inputValue}
        onChange={(e) => onChangeValueCheckbox(e)}
        name={prop.propName}
        checked={valueToChange && inputValue === 'true'}
      />
    )
  } else if (prop.propType === 'file') {
    const handleChangeloadedFile = () => {
      setLoadedFile(null)
    }

    const zipStyle = {
      display: 'visible',
    }

    input = (
      <div>
        {
          !loadedFile &&
              <input
                name={prop.propName}
                type="file"
                className="file-input file-input-bordered w-full max-w-xs"
                onChange={(e) => onChangeValue(e)}
              />
        }
        {loadedFile && <div className="flex mt-5 items-center">{loadedFile.name}
          <div className='ml-5' onClick={handleChangeloadedFile}>
            <CloseIcon height='14' width='14'/>
          </div>
        </div>}

        {
          ARCHIVE_MIME_TYPES.includes(loadedFile?.type) &&
            <div className='flex mt-4' style={zipStyle} >
              <input
                type="checkbox"
                className="checkbox"
                id='unzip_checkbox'
                name='unzip_checkbox'
                checked={isShowUnzipCheckbox}
                onChange={(e) => setShowUnzipCheckbox(e.target.checked)}

              />
              <label htmlFor="unzip_checkbox" className="label-text ml-4">{t('UnzipAfter')}</label>
            </div>
        }
      </div>
    )
  } else if (prop.propType === 'multichoice') {
    return <MultiChoice
      name={prop.propName}
      initialValue={(valueToChange || loadedFile) && inputValue}
      values={prop.values}
    />
  }

  return (
    <label className="form-control w-full max-w-xs mb-4">
      <div className="label">
        <span className="label-text">{t(prop.propName)}</span>
      </div>
      {input}
    </label>
  )
}

export function buildDerivedMap(resourceDescription) {
  const derivedMap = {}

  for (const prop of resourceDescription.props) {
    if (!prop.propDerived) {
      continue
    }

    for (const sourcePropName of prop.propDerived.derivedFromProps) {
      if (!derivedMap[sourcePropName]) {
        derivedMap[sourcePropName] = []
      }
      derivedMap[sourcePropName].push({
        prop,
        derivedFunc: prop.propDerived.derivedFunc
      })
    }
  }

  return derivedMap
}

const ResourceDrawerForm: React.FC<TypeResourceDrawerFormProps>  = ({
  resource = null,
  dataToChange = null,
  setDataToChange,
  setFileDragged = () => {},
  resourceDescription,
  instance = null,
  onSubmit = () => {},
  onCancel = () => {},
  fileDragged= null,
  listOfJson= null,
  whatToAdd,
  setErrorFromApi = () => {},
  errorFromApi= null,
}) => {
  const description = useMemo(() => {
    if (dataToChange !== null){
      //если есть поля которые нельзя менять, добавляем в DESCRIPTION пометку - isNotEdit
      return {
        ...resourceDescription,
        props: resourceDescription?.props.filter(i => !i.isNotEdit)
      }
    } else {
      return {
        ...resourceDescription,
        props: resourceDescription.props.filter(i => !i.isReadOnly)
      }
    }
  }, [resourceDescription])

  const drawerContext = useContext(Drawer.Context)

  const { isShowForm } = drawerContext
  const [err, setErr] = useState('')
  const [loadedFile, setLoadedFile] = useState(null)
  const [currentToSubmit, setCurrentToSubmit] = useState({})
  const [text, setText] = useState(JSON.stringify(dataToChange?.resource_value || {}, null, 2))
  const [html, setHtml] = useState(dataToChange?.resource_value?.html  || '')
  const [isShowUnzipCheckbox, setShowUnzipCheckbox] = useState(false)
  const tenant = useTenant()
  const t = useTranslations('Form')
  const tResource = useTranslations('Resource')
  const form = useRef<any>(null)

  const [globalText, setGlobalText] = useState({})
  // globalText - собирает в себя поля json из компонента ResourceInputListJson, ключи объекта наименование из resourceDescription.propName

  const derived = useMemo(() => {
    return buildDerivedMap(description)
  }, [description])

  useEffect(() => {
    if (fileDragged && fileDragged[0]?.size > MAXIMUM_SIZE){
      setErr('Размер файла больше 1000Мб')
      setLoadedFile(null)
    } else {
      setLoadedFile(fileDragged && fileDragged[0])
    }
  }, [fileDragged])

  useEffect(() => {
    if(errorFromApi){
      setErrorFromApi(null)
    }
  },[isShowForm])

  const onFormSubmit = (e) => {
    e.preventDefault()
    setErr('')

    const toSubmit = propsToValues(
      description.props, form.current, instance, loadedFile
    )

    if (description.requiredProps && description.requiredProps.length > 0) {
      for (const requiredProp of description.requiredProps) {
        if (!toSubmit[requiredProp] && instance !== null) {
          // при редактировании если удалили значение из обяз полей, то подставляем старое значение
          toSubmit[requiredProp] = instance[requiredProp]
        }

        if (!toSubmit[requiredProp]) {
          setErr(`${t('fillProp')}: ${tResource(requiredProp)}`)
          return
        }
      }
    }
    if (whatToAdd === 'file' && !loadedFile) {
      setErr(`${t('fillProp')}: ${tResource('file')}`)
      return
    }

    if (whatToAdd === 'json') {
      if (!text){
        setErr(`${t('fillProp')}: ${tResource('json')}`)
        return
      }
      toSubmit.json =  JSON.parse(text)
    }

    if (whatToAdd === 'html') {
      if (!text){
        setErr(`${t('fillProp')}: ${tResource('html')}`)
        return
      }
      toSubmit.html = html
    }

    if (globalText) {
      // все поля из globalText уходят в Submit, как объект с ключами из globalText
      Object.assign(toSubmit, globalText)
    }

    // для сохранения местоположения файла, используем путь из сохраненного файла
    if (dataToChange) {
      toSubmit.path = dataToChange?.path
    }

    if (isShowUnzipCheckbox) {
      toSubmit.unzip = true
    }
    console.log('toSubmit',toSubmit)

    if (description.needTenant) {
      toSubmit.tenant = tenant
    }

    onSubmit(toSubmit)
      .then(() => {
        drawerContext?.setShowFormFlag(false)
        setLoadedFile(null)
        if (dataToChange && setDataToChange) {
          setDataToChange(null)
        }
      })
  }

  const onFormUpdate = (name, value, files) => {
    if (files && files[0]?.size > MAXIMUM_SIZE){
      setErr('Размер файла больше 1000Мб')
      form.current[2].value = null
      setLoadedFile(null)
    } else {
      // положили выбранный файл в стеит файлов
      setLoadedFile(files && files[0] || loadedFile)
      setErr('')
    }
    if (!derived[name]) {
      return
    }

    let val = {
      ...currentToSubmit,
      [name]: value
    }

    for (const { prop, derivedFunc } of derived[name]) {
      const propValue = derivedFunc(val)
      val[prop.propName] = propValue

      // TODO: When we will need a validation move
      // to approach with a managed input
      if (form.current && form.current[prop.propName]) {
        form.current[prop.propName].value = propValue
      }
    }
    setCurrentToSubmit(val)
  }

  const onFormCancel = () => {
    onCancel()
    setErrorFromApi(null)
    drawerContext?.setShowFormFlag(false)
    setFileDragged(null)
    if (dataToChange && setDataToChange) {
      setDataToChange(null)
    }
  }

  return (
    <div className={cn(scrollStyles.scroll, 'wrapper-form')}>
      {resource && <div className="ml-10 mb-10" >{tResource(resource)}</div>}
      <form ref={form} onSubmit={onFormSubmit} >
        {
          description?.props?.map((item) => (
            <ResourceInput
              key={item.propName}
              prop={item}
              valueToChange={dataToChange}
              onChange={onFormUpdate}
              loadedFile={loadedFile}
              setLoadedFile={setLoadedFile}
              isShowUnzipCheckbox={isShowUnzipCheckbox}
              setShowUnzipCheckbox={setShowUnzipCheckbox}
            />
          ))
        }
        {/*listOfJson это СПИСОК из нескольких инпутов для ввода 'json' , применяется от типа propType: 'json' и listOfJson={true}
        его state - globalText*/}
        {
          listOfJson &&
            description?.props?.map((item) => (
              <ResourceInputListJson
                key={item.propName}
                setGlobalText={setGlobalText}
                globalText={globalText}
                prop={item}
                valueToChange={dataToChange}
              />
            ))
        }
        {/*whatToAdd === 'json' это отдельный ОДНИН инпут для 'json' из fileManager, его state - text*/}
        {
          (whatToAdd === 'json') &&
            <JsonEditorForm
              text={text}
              setText={setText}
            />
        }
        {
          (whatToAdd === 'html') &&
            <div>
              <Tiptap
                htmlContent={html}
                setHtml={setHtml}
              />
            </div>
        }
        <div className="mt-5">
          <button type="submit" className="btn btn-primary mr-5">{t('Save')}</button>
          <button className="btn" onClick={onFormCancel} >{t('Cancel')}</button>
        </div>
        {err && <div className="mt-5">{err}</div>}
      </form>
    </div>
  )
}

export default ResourceDrawerForm

function ResourceInputListJson({ setGlobalText, prop, globalText, valueToChange }) {
  const t = useTranslations('Resource')

  let input:any = null
  const propName = prop.nameFromApi ?? prop.propName
  const val =  _.get(valueToChange, propName)
  const [textToTypeJson, setTextToTypeJson] = useState(JSON.stringify(val || {}, null, 2))

  useEffect(() => {
    setGlobalText({
      ...globalText,
      [prop.propName]: JSON.parse(textToTypeJson)
    })
  }, [textToTypeJson])

  if (prop.propType === 'json') {
    input = (
      <JsonEditorForm
        text={textToTypeJson}
        setText={setTextToTypeJson}
      />
    )
  } else {
    return
    // return - чтобы другие инпуты из description, не вылезали
  }

  return (
    <label className="form-control w-full mb-4">
      <div className="label">
        <span className="label-text">{t(prop.propName)}</span>
      </div>
      {input}
    </label>
  )
}
