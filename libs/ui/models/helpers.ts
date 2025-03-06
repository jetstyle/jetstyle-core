import slugify from 'slugify'
import { STATUS_CLASS_MAP } from '../models/descriptions'

export function translit(str) {
  const repStr = str.replace(/[.-]/g, '_')

  return slugify(repStr, {
    replacement: '_',  // replace spaces with replacement character, defaults to `-`
    remove: /[*+~.()'"!:@]/g,
    lower: true,      // convert to lower case, defaults to `false`
    // strict: true,     // strip special characters except replacement, defaults to `false`
    trim: true         // trim leading and trailing replacement chars, defaults to `true`
  })
}

export function badgeClassFunc(status) {
  return STATUS_CLASS_MAP[status] || ''
}
