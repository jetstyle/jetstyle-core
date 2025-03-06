export function getRandomInt(min: number, max: number): number {
  min = Math.floor(min)
  max = Math.floor(max)
  return Math.round(
    Math.random() * (max - min)
  ) + min
}

export function sleep(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^A-Za-z0-9._-]/g, '-')
}

export type TOk<T> = {
  err: null
  value: T
}

export type TErr = {
  err: string
  errDescription?: string
}

export type TResult<T> = TOk<T> | TErr

export function Ok<T>(value: T): TOk<T> {
  return {
    err: null,
    value
  }
}

export function Err(err: string, errDescription?: string): TErr {
  return { err, errDescription }
}

export function assertNever(d: never) {
  console.log('never', d)
}

export function validatePath(resourcePath: string) {
  const splitPath = resourcePath.split('.')
  for (let part of splitPath) {
    if (part.match(/[^a-zA-Z0-9а-яА-Яα-ωΑ-Ω_]+/g)) {
      return false
    }
  }
  return true
}

export function validFilename(fileName: string): boolean {
  // Define unsafe characters in file names: /, \0, whitespace, and special shell characters
  const unsafeCharacters = /[/\0\s<>:"'|?*#]/

  return (
    fileName.length > 0 &&
    fileName !== '.' &&
    fileName !== '..' &&
    !unsafeCharacters.test(fileName)
  )
}

export function urlModQuery(url: string, name: string, value: string): TResult<string> {
  try {
    const parsedUrl = new URL(url)
    parsedUrl.searchParams.set(name, value)
    return Ok(parsedUrl.toString())
  } catch (error: any) {
    return Err(error.toString())
  }
}

export function arrayIntersection<T>(arr1: Array<T>, arr2: Array<T>): Array<T> {
  const set2 = new Set(arr2)
  return arr1.filter(item => set2.has(item))
}