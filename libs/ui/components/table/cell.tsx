import formatterDate, { formatterDateDay } from '../formatters/formatterDate'
import { useTranslations } from 'next-intl'
import cn from 'classnames'
import { badgeClassFunc } from '../../models/helpers'

export function Cell({ instance, prop }) {
  const t = useTranslations('Files')

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content)
  }

  const status = instance?.additional_meta?.conversionStatus
  const badgeClass = badgeClassFunc(status)

  if (prop.presenter) {
    const Presenter = prop.presenter
    return <Presenter instance={instance} prop={prop} options={prop.presenterOptions} />
  }

  if (prop.propType === 'datetime') {
    if (instance[prop.propName]) {
      return formatterDate(instance[prop.propName])
    }
    return ''
  } else if (prop.propType === 'date') {
    return formatterDateDay(instance[prop.propName])
  } else if (prop.propType === 'boolean') {
    return instance[prop.propName]?.toString()
  } else if (prop.propType === 'json') {
    return JSON.stringify(instance[prop.propName], null, 2)
  } else if (prop.propName === 'uuid') {
    return <div className="font-mono text-xs cursor-pointer hover:underline" onClick={()=> handleCopy(instance[prop.propName])}>{instance[prop.propName]}</div>
  }  else if (prop.propName === 'conversionStatus') {
    return <div
      onClick={()=> handleCopy(instance[prop.propName])}>
      {instance?.additional_meta?.conversionStatus &&
          <span className={cn(badgeClass, 'text-xs min-w-[95px] badge cursor-pointer hover:underline')}>
            {t(instance?.additional_meta?.conversionStatus)}
          </span>
      }
    </div>
  } else if (prop.propName === 'avatar' && instance?.avatarCp) {
    return <div className="font-mono text-xs w-[35px] h-[35px]">
      <img alt={instance?.avatarCp?.fileAsset?.originFileName}
        className='object-cover w-full h-full rounded-full'
        src={instance?.avatarCp?.downloadUrl}/>
    </div>
  } else if  (prop.propName === 'customLabels') {
    return(
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {
          instance?.[prop.propName]?.map((item, index) => {
            return <span className='rounded-3xl px-2 py-2 text-xs bg-base-200' key={index}>{item[0]}: <b>{item[1]}</b></span>
          })
        }
      </div>
    )
  } else if (prop.propType === 'multichoice') {
    const arr = instance[prop.propName] ?? []
    return <div>{arr.join(' ')}</div>
  } else {
    return <div>{instance[prop.propName]}</div>
  }
}
