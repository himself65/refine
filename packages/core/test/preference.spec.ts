import { test, beforeAll, expect, vi } from 'vitest'
import { settingAtom } from '../src/store/preference'
import { Schema, Workspace } from '@blocksuite/store'
import { AffineSchemas } from '@blocksuite/blocks/models'
import { getDefaultStore } from 'jotai/vanilla'
import type { Doc, Array as YArray } from 'yjs'
import { YKeyValue } from 'y-utility/y-keyvalue'
import { RESET } from 'jotai/utils'

const schema = new Schema()
beforeAll(() => {
  schema.register(AffineSchemas)
})

test('settingAtom', async () => {
  const workspace = new Workspace({
    id: 'test-workspace',
    schema: new Schema()
  })
  const testValueAtom = settingAtom(
    workspace,
    'test-user',
    'test-key',
    'test-value'
  )
  const store = getDefaultStore()
  expect(store.get(testValueAtom)).toBe('test-value')
  store.set(testValueAtom, 'test-value-2')
  expect(store.get(testValueAtom)).toBe('test-value-2')
  store.set(testValueAtom, () => 'test-value-2')
  const settingDoc = workspace.doc.getMap('settings').get('test-user') as Doc
  const kv = new YKeyValue(settingDoc.getArray('setting') as YArray<{
    key: string,
    val: unknown
  }>)
  expect(kv.get('test-key')).toBe('test-value-2')
  const unsub = store.sub(testValueAtom, vi.fn())
  kv.set('test-key', 'test-value-3')
  kv.delete('test-key')
  expect(store.get(testValueAtom)).toBe('test-value')
  unsub()
  store.set(testValueAtom, 'test-value-2')
  expect(store.get(testValueAtom)).toBe('test-value-2')
  store.set(testValueAtom, RESET)
  expect(store.get(testValueAtom)).toBe('test-value')
})

test('settingAtom with defaultValue', () => {
  const workspace = new Workspace({
    id: 'test-workspace',
    schema: new Schema()
  })
  const testValueAtom = settingAtom(
    workspace,
    'test-user',
    'test-key',
    'test-value'
  )
  const settingDoc = workspace.doc.getMap('settings').get('test-user') as Doc
  const kv = new YKeyValue(settingDoc.getArray('setting') as YArray<{
    key: string,
    val: unknown
  }>)
  const store = getDefaultStore()
  expect(kv.get('test-key')).toBe(undefined)
  expect(store.get(testValueAtom)).toBe('test-value')
  const unsub = store.sub(testValueAtom, vi.fn())
  expect(kv.get('test-key')).toBe(undefined)
  expect(store.get(testValueAtom)).toBe('test-value')
  unsub()
})
