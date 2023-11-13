import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createLazyProvider } from '../src'
import { Doc, encodeStateAsUpdate, mergeUpdates } from 'yjs'

const emptyUpdate = new Uint8Array([0, 0])
const localCache = new Map<string, Uint8Array>()

beforeEach(() => {
  localCache.clear()
})

function createMemoryProvider (rootDoc: Doc) {
  let callback: ((guid: string, update: Uint8Array) => void) | null
  const lazyProvider = createLazyProvider(rootDoc, {
    queryDocState: async (guid) => {
      const cached = localCache.get(guid) ?? emptyUpdate
      return {
        missingUpdate: cached
      }
    },
    sendDocUpdate: async (guid, update) => {
      const cache = localCache.get(guid)
      if (cache) {
        update = mergeUpdates([cache, update])
      }
      localCache.set(guid, update)
    },
    onDocUpdate: (_callback) => {
      callback = _callback
      return () => {
        callback = null
      }
    }
  })
  return {
    lazyProvider,
    get callback () {
      return callback
    }
  }
}

describe('lazy-provider', () => {
  test('basic', async () => {
    const rootDoc = new Doc({
      guid: '1'
    })
    const result = createMemoryProvider(rootDoc)
    const lazyProvider = result.lazyProvider
    {
      const cached = localCache.get('1')
      expect(cached).toEqual(undefined)
    }
    lazyProvider.connect()
    await vi.waitFor(() => {
      const cached = localCache.get('1')
      expect(cached).not.toEqual(undefined)
    })
    expect(result.callback).not.toBe(null)
    {
      const cached = localCache.get('1')
      expect(cached).toEqual(encodeStateAsUpdate(rootDoc))
    }
    lazyProvider.disconnect()
    await vi.waitFor(() => {
      expect(result.callback).toBe(null)
    })
  })
})
