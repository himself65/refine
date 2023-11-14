import type { DataSourceAdapter } from 'y-utils'
import { RocksLevel } from '@nxtedition/rocksdb'
import { decodeUpdate, diffUpdate, mergeUpdates } from 'yjs'
import type { AbstractSublevel } from 'abstract-level'
import crypto from 'node:crypto'
import { v5 as uuid } from 'uuid'

const namespace = '9f70269f-a4d2-4fa6-b8b3-fb296ffc0649'

const MIN = '00000000-0000-0000-0000-000000000000'
const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff'

export function encodeStoreUpdateKey (guid: string, hash: string) {
  return [
    guid,
    hash
  ].join('#')
}

export async function findAllDocUpdateKeys (
  db: AbstractSublevel<RocksLevel<unknown, string, string>, unknown, string, string>,
  guid: string
) {
  const iterator = db.keys({
    gte: encodeStoreUpdateKey(guid, MIN),
    lt: encodeStoreUpdateKey(guid, MAX)
  })
  const keys: string[] = []
  for await (const key of iterator) {
    keys.push(key)
  }
  return keys
}

export async function findDocUpdate (
  db: AbstractSublevel<RocksLevel<unknown, string, string>, unknown, string, string>,
  guid: string
) {
  const iterator = db.iterator({
    gte: encodeStoreUpdateKey(guid, MIN),
    lt: encodeStoreUpdateKey(guid, MAX)
  })
  const updates: Uint8Array[] = []
  for await (const [_, value] of iterator) {
    const buffer = Buffer.from(value, 'base64')
    updates.push(new Uint8Array(buffer))
  }
  return updates
}

type ExternalData = {
  level: RocksLevel<unknown, string, string>
}

export function createServerDataSource (filePath: string): DataSourceAdapter & ExternalData {
  const level = new RocksLevel(filePath)
  const db = level.sublevel('v1')
  return {
    get level () {
      return level
    },
    queryDocState: async (guid, query) => {
      const update = mergeUpdates(await findDocUpdate(db, guid))
      if (query?.stateVector) {
        return {
          missingUpdate: diffUpdate(update, query.stateVector)
        }
      } else {
        return {
          missingUpdate: update
        }
      }
    },
    sendDocUpdate: async (guid, update) => {
      const decoded = decodeUpdate(update)
      const id = decoded.structs.at(0)?.id
      // tip: this guarantees that id is unique
      const hash = id
        ? uuid(`${id.clock}-${id.client}`, namespace)
        : uuid(crypto.randomBytes(32).toString('base64'), namespace)
      await db.put(
        encodeStoreUpdateKey(guid, hash),
        Buffer.from(update).toString('base64')
      )
    }
  }
}
