import { expect, test, describe } from 'vitest'

import { TResult, Ok, Err } from '../src/index.js'

describe('errors', () => {

  // You can use TResult with primitive types
  function myPrimitiveFunction(
    okOrError: 'ok-auto' | 'ok-manual' | 'err-manual' | 'err-auto'
  ): TResult<string> {
    if (okOrError === 'err-manual') {
      // You can return TErr manually
      return {
        err: 'not_found',
        errDescription: 'Something really wasn\'t found'
      }
    } else if (okOrError === 'err-auto') {
      // You can return TErr with a helper method
      return Err('not_found')
    } else if (okOrError === 'ok-manual') {
      // The same with real  result
      return {
        err: null,
        value: 'Manual hello world!'
      }
    }
    return Ok('Hello world!')
  }

  type DemoUser = {
    uuid: string
    name: string
  }

  async function demoGetUser(uuid: string): Promise<TResult<DemoUser>> {
    if (uuid === '1') {
      return Ok({
        uuid,
        name: 'Vasya'
      })
    }

    return Err('not_found', 'User not found')
  }

  test('should handle success with if', () => {
    const result = myPrimitiveFunction('ok-manual')

    // You need to handle error before you extract the value
    if (result.err !== null) {
      // Ah-ha, there is an error!
    } else {
      expect(result.value).toBe('Manual hello world!')
    }
  })

  test('should handle error with if and return', () => {
    const result = myPrimitiveFunction('err-auto')
    if (result.err !== null) {
      // Ah-ha, there is an error!
      expect(result.err).toBe('not_found')
      return
    }

    // This line would compile safely, but never called
    expect(result.value).toBe('Manual hello world!')
  })

  test('should handle complex async TResult', async () => {
    // The same with promises
    const result = await demoGetUser('1')
    if (result.err === null) {
      expect(result.value.name).toBe('Vasya')
    }
  })
})