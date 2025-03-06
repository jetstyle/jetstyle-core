import { type ResourceProp } from '../types/types'

export function propsToValues(props: Array<ResourceProp>, form: any, instance: any = null, loadedFile) {
  if (!form) {
    return
  }
  const toSubmit:any = {}
  for (const prop of props) {
    if (!form[prop.propName]) {
      continue
    }

    if(loadedFile) {
      toSubmit.file = loadedFile
    }

    let value
    if (prop.propType === 'boolean') {
      value = form[prop.propName].checked
    } else if (prop.propType === 'number') {
      value = Number(form[prop.propName].value)
    } else if (prop.propType === 'multichoice') {
      let inputs = form[prop.propName]
      if (!Array.isArray(inputs)) {
        inputs = [inputs]
      }

      const values = new Array<string>()
      for (const input of inputs) {
        if (input.checked) {
          values.push(input.value)
        }
      }
      value = values
    } else if (prop.propType === 'string' && prop.enum) {
      value = form[prop.propName].value
      if (value === 'null') {
        value = null
      }
    } else {
      value = form[prop.propName].value
    }

    if (instance !== null && instance[prop.propName] === value) {
      continue
    }
    if (instance === null && !value) {
      continue
    }
    if (instance !== null && !value) {
      if (instance[prop.propName] !== null) {
        toSubmit[prop.propName] = null
      }
    } else {
      toSubmit[prop.propName] = value
    }
  }
  return toSubmit
}