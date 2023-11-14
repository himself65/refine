import { beforeAll, describe, expect, test } from 'vitest'
import { mkdir } from 'node:fs/promises'
import * as crypto from 'crypto'
import { RocksLevel } from '@nxtedition/rocksdb'
import {
  createServerDataSource,
  findAllDocUpdateKeys,
} from '../src/desktop'
import { applyUpdate, Doc } from 'yjs'

let filename: string

beforeAll(async () => {
  await mkdir('./test/.cache', {
    recursive: true
  })
  filename = `./test/.cache/${crypto.randomUUID()}.refine`
})

describe('rocksdb', () => {
  test('basic put/get', async () => {
    const db = new RocksLevel(filename)
    await db.put('1', '2')
    expect(await db.get('1')).toBe('2')
    await db.del('1')
    await expect(() => db.get('1')).rejects.toThrowError()
  })
})

describe('desktop', () => {
  test('basic', async () => {
    const dataSource = createServerDataSource(filename)
    const doc = new Doc({
      guid: '1'
    })
    const promises: Promise<void>[] = []
    doc.on('update', (update: Uint8Array) => {
      promises.push(dataSource.sendDocUpdate('1', update, 'origin'))
    })
    const map = doc.getMap()
    map.set('a', 1)
    map.set('b', 2)
    map.set('c', 3)
    expect(promises.length).toBe(3)
    await Promise.all(promises)
    {
      const level = dataSource.level
      const db = level.sublevel('v1')
      const keys = await findAllDocUpdateKeys(db, '1')
      expect(keys.length).toBe(3)
      const update = await dataSource.queryDocState('1')
      const doc = new Doc({
        guid: '2'
      })
      applyUpdate(doc, update.missingUpdate)
      const map = doc.getMap()
      expect(map.get('a')).toBe(1)
      expect(map.get('b')).toBe(2)
      expect(map.get('c')).toBe(3)
    }
  })
})
