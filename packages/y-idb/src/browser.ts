import {
  openDB,
  DBSchema,
  IDBPDatabase
} from 'idb'
import { Workspace, ProviderAdapter, StatusAdapter } from './shared/type.js'
import { createLazyProvider } from './shared/lazy-provider.js'
import {
  applyUpdate,
  diffUpdate,
  Doc,
  encodeStateAsUpdate,
  encodeStateVectorFromUpdate
} from 'yjs'

const mergeCount = 200

function mergeUpdates (updates: Uint8Array[]): Uint8Array {
  const doc = new Doc()
  for (const update of updates) {
    applyUpdate(doc, update)
  }
  return encodeStateAsUpdate(doc)
}

interface YDB extends DBSchema {
  workspace: {
    key: string
    value: Workspace,
    indexes: {
      guid: string
    }
  }
}

export function createIndexedDBProvider (
  name: string, rootDoc: Doc): ProviderAdapter & StatusAdapter {
  let lazyDBPromise: Promise<IDBPDatabase<YDB>> | null = null
  const getDB = async (name: string): Promise<IDBPDatabase<YDB>> => {
    if (lazyDBPromise !== null) {
      return lazyDBPromise
    }
    lazyDBPromise = openDB<YDB>(name, 1, {
      upgrade (db) {
        {
          db.createObjectStore('workspace', {
            keyPath: 'guid'
          })
        }
      }
    })
    return lazyDBPromise
  }
  return createLazyProvider(rootDoc, {
    queryDocState: async (guid, query) => {
      const db = await getDB(name)
      const tx = db.transaction('workspace', 'readonly')
      const os = tx.objectStore('workspace')
      const workspace = await os.get(guid)
      if (workspace === undefined || workspace.updates.length === 0) {
        return {
          missingUpdate: new Uint8Array()
        }
      }

      const { updates } = workspace

      const update = mergeUpdates(updates.map(({ update }) => update))

      const missingUpdate = query?.stateVector
        ? diffUpdate(update, query?.stateVector)
        : update

      return { missingUpdate, stateVector: encodeStateVectorFromUpdate(update) }
    },
    sendDocUpdate: async (guid, update) => {
      const db = await getDB(name)
      const tx = db.transaction('workspace', 'readwrite')
      const os = tx.objectStore('workspace')
      const data = await os.get(guid)
      if (data === undefined) {
        await os.add({
          guid,
          updates: [],
          author: name
        })
      } else {
        if (data.updates.length > mergeCount) {
          data.updates = [
            {
              update: mergeUpdates(data.updates.map(({ update }) => update)),
              date: Date.now()
            }
          ]
        }
        await os.put({
          guid,
          updates: [
            ...data.updates, {
              date: Date.now(),
              update
            }
          ],
          author: name
        })
      }
    }
  }, {
    author: 'ydb'
  })
}
