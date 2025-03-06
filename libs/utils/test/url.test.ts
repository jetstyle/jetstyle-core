import { expect, test, describe } from 'vitest'

import { urlModQuery } from '../src/index.js'

describe('urls', () => {
  test('should modify valid url', () => {
    const url = 'https://example.com'
    const url1 = urlModQuery(url, 'foo', 'boo')

    if (url1.err !== null) {
      throw new Error(url1.err)
    }

    const parsed1 = new URL(url1.value)
    expect(parsed1.searchParams.get('foo')).toBe('boo')
  })

  test('should give error for invalid url', () => {
    const result = urlModQuery('invalid-url', 'name', 'JohnDoe')
    expect(result.err).not.toBe(null)
  })

  test('should give error for relative url', () => {
    const result = urlModQuery('./invalid-url.ru', 'name', 'JohnDoe')
    expect(result.err).not.toBe(null)
  })
})
