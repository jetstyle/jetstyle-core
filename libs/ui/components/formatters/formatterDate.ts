import dayjs from 'dayjs'
import 'dayjs/locale/ru'

export default function formatterDate(value) {
  return dayjs(value).format('DD.MM.YYYY HH:mm')
}
export function formatterDateDay(value) {
  return dayjs(value).format('DD.MM.YYYY')
}

export function formatTime(value) {
  return dayjs(value).format('HH:mm')
}

export function formatterDateToSchedule(value) {
  dayjs.locale('ru')
  return dayjs(value).format('D MMMM YYYY')
}