import { describe, test, vi, expect } from 'vitest'
import { applyUpdate, decodeUpdate, Doc, encodeStateAsUpdate } from 'yjs'
import { dumpDoc, willMissingUpdate, willMissingUpdateV2 } from '../src'
import { Array as YArray } from 'yjs'
import { encryptUpdateV1 } from '../src/encrypt'
import * as crypto from 'node:crypto'
import { decryptUpdateV1 } from '../src/decrypt'

describe('function dumpDoc', () => {
  test('should dump the doc', () => {
    const doc = new Doc({
      guid: '1'
    })
    doc.getMap().set('1', 2)
    const updates = dumpDoc(doc)
    expect(updates.size).toBe(1)
  })

  test('should dump the subdoc', () => {
    const doc = new Doc({
      guid: '1'
    })
    doc.getMap().set('1', 2)
    const subdoc = doc.getMap().set('a', new Doc({
      guid: '2'
    }))
    subdoc.getMap().set('1', 2)
    const updates = dumpDoc(doc)
    expect(updates.size).toBe(2)
  })
})

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
      [doc.clientID, 3]
    ]))
    applyUpdate(remoteDoc, updates[3])
    expect(remoteDoc.getMap().get('a')).toBe(1)
    expect(remoteDoc.getMap().get('b')).toBe(undefined)
    expect(willMissingUpdate(remoteDoc, updates[2])).toBe(false)
    applyUpdate(remoteDoc, updates[2])
    expect(willMissingUpdate(remoteDoc, updates[3])).toBe(false)
  })
})

test('encrypt and decrypt should works', async () => {
  const doc = new Doc()
  const arr = new YArray()
  arr.insert(0, [1, 2, 3])
  doc.getArray().insert(0, [1, 2, 3, arr])
  const deriveKeyPair = await crypto.subtle.generateKey({
    name: 'ECDH',
    namedCurve: 'P-256'
  }, true, ['deriveKey'])
  const signKeyPair = await crypto.subtle.generateKey({
    name: 'ECDSA',
    namedCurve: 'P-256'
  }, true, ['sign', 'verify'])
  const encryptDecryptKey = await crypto.subtle.deriveKey({
    name: 'ECDH',
    public: deriveKeyPair.publicKey
  }, deriveKeyPair.privateKey, {
    name: 'AES-GCM',
    length: 256
  }, true, ['encrypt', 'decrypt'])
  const { iv, encryptedUpdate } = await encryptUpdateV1(
    encryptDecryptKey,
    encodeStateAsUpdate(doc)
  )
  const signature = await crypto.subtle.sign({
    name: 'ECDSA',
    hash: 'SHA-256'
  }, signKeyPair.privateKey, encryptedUpdate)
  type DataChunk = {
    iv: Uint8Array
    encryptedUpdate: Uint8Array
    signature: Uint8Array
  }
  const dataChunk = {
    iv,
    encryptedUpdate,
    signature: new Uint8Array(signature)
  } satisfies DataChunk
  expect(() => decodeUpdate(dataChunk.encryptedUpdate)).not.toThrow()
  await expect(crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: 'SHA-256'
    }, signKeyPair.publicKey, dataChunk.signature.buffer,
    dataChunk.encryptedUpdate
  )).resolves.toBe(true)

  const update = await decryptUpdateV1(encryptDecryptKey, dataChunk.iv,
    dataChunk.encryptedUpdate)
  expect(() => decodeUpdate(update)).not.toThrow()
  const secondDoc = new Doc()
  applyUpdate(secondDoc, update)
  encodeStateAsUpdate(secondDoc)
  expect(secondDoc.getArray().toJSON()).toEqual([1, 2, 3, [1, 2, 3]])
  expect(encodeStateAsUpdate(secondDoc)).toEqual(encodeStateAsUpdate(doc))
})
