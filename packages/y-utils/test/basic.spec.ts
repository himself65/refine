import { describe, test, vi, expect } from 'vitest'
import { applyUpdate, Doc } from 'yjs'
import { willMissingUpdate, willMissingUpdateV2 } from '../src'

describe('function willLostData', () => {
  test('should will not lost data in the update itself', () => {
    const doc = new Doc()
    const onUpdate = vi.fn((update: Uint8Array) => {
      expect(willMissingUpdate(doc, update)).toBe(false)
    })
    const onUpdateV2 = vi.fn((update: Uint8Array) => {
      expect(willMissingUpdateV2(doc, update)).toBe(false)
    })
    doc.on('update', onUpdate)
    doc.on('updateV2', onUpdateV2)
    expect(onUpdate).toHaveBeenCalledTimes(0)
    const map = doc.getMap()
    map.set('a', 1)
    expect(onUpdate).toHaveBeenCalledTimes(1)
    doc.transact(() => {
      map.set('b', 2)
      map.set('a', 2)
    })
    expect(onUpdate).toHaveBeenCalledTimes(2)
  })

  test('should will lose data in the inordered remote update', () => {
    const doc = new Doc()
    const remoteDoc = new Doc()
    const updates: Uint8Array[] = []
    const onUpdate = vi.fn((update: Uint8Array) => {
      expect(willMissingUpdate(doc, update)).toBe(false)
      updates.push(update)
    })
    doc.on('update', onUpdate)
    const map = doc.getMap()
    map.set('a', 1)
    map.set('b', 2)
    expect(updates.length).toBe(2)
    expect(willMissingUpdate(remoteDoc, updates[1])).toEqual(new Map([
      [doc.clientID, 1]
    ]))
    applyUpdate(remoteDoc, updates[0])
    expect(willMissingUpdate(remoteDoc, updates[1])).toBe(false)
    applyUpdate(remoteDoc, updates[1])

    map.set('a', 2)
    map.set('b', 3)
    expect(willMissingUpdate(remoteDoc, updates[3])).toEqual(new Map([
      [doc.clientID, 3],
    ]))
    applyUpdate(remoteDoc, updates[3])
    expect(remoteDoc.getMap().get('a')).toBe(1)
    expect(remoteDoc.getMap().get('b')).toBe(undefined)
    expect(willMissingUpdate(remoteDoc, updates[2])).toBe(false)
    applyUpdate(remoteDoc, updates[2])
    expect(willMissingUpdate(remoteDoc, updates[3])).toBe(false)
  })
})
