import { useTranslations } from 'next-intl'
import React, { useContext, useState, useEffect } from 'react'
import { Pencil } from 'lucide-react'
import {
  deleteResource,
  fetchConfig,
  fetchResource
} from '../helpers/api'
import useTenant from './../hooks/useTenant'

import DownloadIcon from './icons/Download'
import DeleteIcon from './icons/Delete'
import CopyIcon from './icons/Copy'
import ConfirmModal from './confirm-modal/ConfirmModal'
import Drawer from './Drawer'

type ActionsProps = {
  instance: any
  resourceDescription: any
  onRefresh: any
  onEditButtonClick: any
  apiPath: any
  apiService: any
}

export default function Actions({
  instance,
  resourceDescription,
  onRefresh = () => {},
  onEditButtonClick = null,
  apiPath= null,
  apiService= null,
}: ActionsProps) {
  const t = useTranslations('Form')
  const uuidProp = resourceDescription.customDeletedId ? resourceDescription.customDeletedId : resourceDescription.uuidProp ? resourceDescription.uuidProp : 'uuid'
  const apiPathUrl = apiPath ? apiPath : '/resources'
  const apiServiceUrl = apiService ? apiService : 'resource'
  const drawerContext = useContext(Drawer.Context)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccessful, setIsSuccessful] = useState(false)
  const [message, setMessage] = useState('')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      return
    }

    const interval = setInterval(async () => {
      await onDownloadArchiveFromFolder()
      if (isSuccessful) {
        clearInterval(interval)
      }
    }, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [isLoading])

  const onDelete = () => {
    const submissionDataToDelete = {
      apiService: apiServiceUrl,
      apiPath: apiPathUrl,
      resourceId: instance[uuidProp],
    }

    deleteResource(submissionDataToDelete).then(onRefresh)
  }

  const onView = (e) => {
    e?.stopPropagation()
    if(onEditButtonClick) {
      onEditButtonClick(instance)
      drawerContext?.setShowFormFlag(true)
    }
  }

  const onCopy = async () => {
    await navigator.clipboard.writeText(instance.downloadUrl)
  }

  const onDownloadWithFilePathId = async (e) => {
    e?.stopPropagation()
    await downloadFileWithFilePathId(e, instance)
  }

  // Архивы
  const onDownloadArchiveFromFolder = async (e?) => {
    setIsSuccessful(false)

    const submissionData = {
      apiService: apiServiceUrl,
      apiPath: apiPathUrl,
      customPath: `/${instance[uuidProp]}/download-request`
    }
    console.log('submissionData',submissionData)

    const resp = await fetchResource<any>(submissionData)
    if(resp?.err !== null) {
      setIsLoading(false)
      showMessage()
      setMessage(resp?.err)
      return
    } else {
      const result = resp.value
      if (result?.status === 'error') {
        setIsLoading(false)
        showMessage()
        setMessage(result?.err)
      } else if (result?.status === 'ready') {
        setIsLoading(false)
        setIsSuccessful(true)

        const downloadedUrlArchive = result?.downloadUrl || resp
        await onDownload(e, downloadedUrlArchive)
      }
    }
  }

  const tenant = useTenant()

  // FilePathId  больше для талана
  const downloadFileWithFilePathId = async (e, file) => {
    //ссылка на скачивание из файлового сервера
    const config = await fetchConfig()
    const apiFileServer = 'file-server-storage'
    const apiHost = config?.globalConfig?.serviceLookup?.[apiFileServer] ?? ''
    const urlWithFilePathId = `${apiHost}/${tenant}/storage/download?key=${file?.filePathId}`

    await onDownload(e, urlWithFilePathId)
  }

  const showMessage = () => {
    setIsVisible(true)
    setTimeout(() => {
      setIsVisible(false)
    }, 3000)
  }

  const getDownloadLink = async (downloadedUrl: string) => {
    return new Promise((resolve) =>
      setTimeout(() => resolve(downloadedUrl), 1000)
    )
  }

  const onDownload = async (e, downloadedUrlArchive: any = null) => {
    try {
      const downloadedUrlFromInstance = instance?.storageParams?.downloadUrl || instance?.downloadUrl

      const downloadLink = await getDownloadLink(downloadedUrlArchive ? downloadedUrlArchive : downloadedUrlFromInstance )
      const anchor = document.createElement('a')
      anchor.href = (downloadLink as string)
      anchor.download = '' // Optionally specify a default filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
    } catch (error) {
      console.error('Failed to get download link', error)
    }
  }

  return (
    <>
      <div className="join">
        {instance.downloadUrl && (
          <button className="btn join-item btn-outline btn-sm w-10" title={t('Copy URL')} onClick={onCopy}>
            <CopyIcon/>
          </button>)
        }
        {((instance.storage_type && instance.storage_params?.location) || instance.downloadUrl) && (
          <button
            className="btn join-item btn-outline btn-sm w-10"
            title={t('Download')}
            onClick={onDownload}
          >
            <DownloadIcon/>
          </button>
        )}
        {
          resourceDescription?.isDownload &&
                  <button className="btn join-item btn-outline btn-sm w-10" title={t('Download')}
                    onClick={onDownloadWithFilePathId}><DownloadIcon/></button>
        }
        {
          (Boolean(resourceDescription?.isEditable)) &&
            <label className="btn join-item btn-outline btn-sm w-10" title={t('Edit')} onClick={onView}>
              <Pencil />
            </label>
        }
        <ConfirmModal
          description={t('AreYouSureQuestion')}
          confirm
        >
          {confirm => (
            <button className="btn join-item btn-outline btn-sm btn-error w-10 rounded-lg" title={t('Delete')}
              onClick={confirm(onDelete)}><DeleteIcon/></button>
          )}
        </ConfirmModal>
      </div>
      <>
        {isVisible && (
          <div className="fixed top-5 right-5 p-2 bg-red-500 rounded-lg z-50"
          >
            {message}
          </div>
        )}
      </>
    </>
  )
}
