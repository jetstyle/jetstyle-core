'use client'

import { useTranslations } from 'next-intl'
import React, { useEffect, useRef, useState } from 'react'

import useOutsideClick from '../../hooks/useOutsideClick'
import DeleteIcon from '../icons/Delete.jsx'

import './style.scss'

type CallbackObject = {
    run: () => void; // Defines a method 'run' that performs an action
};

const ConfirmModal = ({ children, description, confirm }) => {
  // confirm - метка для вывода согласия(без него будет обычный попап)

  const t = useTranslations('Form')
  const [open, setOpen] = useState(false)
  const [callback, setCallback] = useState<CallbackObject | any>(null)

  const onOpenModal = callback => (event: any) => {
    event.preventDefault()
    event.stopPropagation()
    setOpen(true)
    event = {
      ...event,
      target: { ...event.target, value: event.target.value }
    }
    setCallback({
      run: () =>
        callback(event)
    })
  }

  const onCloseModal = (event: any) => {
    event?.preventDefault()
    event?.stopPropagation()
    setCallback(null)
    setOpen(false)
  }

  const onConfirm = (e) => {
    callback.run()
    onCloseModal(e)
  }

  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTimeout(() => {
      buttonRef.current?.focus()
    }, 10)
  }, [])

  useOutsideClick(
    mainRef,
    (e:any) => onCloseModal(e),
  )

  return (
    <>
      {children(onOpenModal)}
      {open && (
        <div className='custom-modal'>
          <div className="custom-modal__container  bg-base-200" ref={mainRef}>
            <div className="custom-modal__inner-container">
              <div className="flex justify-center">{description}</div>
              {
                confirm &&
                                <div className="flex justify-around pt-4" style={{ justifyContent:'space-around' }}>
                                  <button className="btn btn-outline btn-sm  rounded-lg" onClick={onCloseModal}>{t('Cancel')}</button>
                                  <button className="btn btn-outline btn-sm btn-error rounded-lg" onClick={onConfirm}>{t('Delete')}</button>
                                </div>
              }
            </div>
            <div className="custom-modal__buttons-block">
              <button
                onClick={onCloseModal}
                title='Close'
                ref={buttonRef}
              >
                <DeleteIcon/>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
export default ConfirmModal
