import { test, beforeAll, expect, vi } from 'vitest'
import { settingAtom } from '../src/store/preference'
import { Schema } from '@blocksuite/store'
import { AffineSchemas } from '@blocksuite/blocks/models'
import { getDefaultStore } from 'jotai/vanilla'
import { Doc } from 'yjs'
import type { Array as YArray } from 'yjs'
import { YKeyValue } from 'y-utility/y-keyvalue'
import { RESET } from 'jotai/utils'
import { workspaceManager } from '../src/store'
import { userInfoAtom } from '../src/store/api'

const schema = new Schema()
beforeAll(() => {
  schema.register(AffineSchemas)
})

test('settingAtom', async () => {
  const workspaceAtom = workspaceManager.getWorkspaceAtom('test-workspace')
  const testValueAtom = settingAtom(
    workspaceAtom,
    'test-key',
    'test-value'
  )
  const store = getDefaultStore()
  store.set(userInfoAtom, {
    username: 'testUser',
    id: 'test-user'
  })
  expect(await store.get(testValueAtom)).toBe('test-value')
  await store.set(testValueAtom, 'test-value-2')
  expect(await store.get(testValueAtom)).toBe('test-value-2')
  await store.set(testValueAtom, () => 'test-value-2')
  const workspace = await store.get(workspaceAtom)
  const settingDoc = workspace.doc.getMap('settings').get('test-user') as Doc
  const kv = new YKeyValue(settingDoc.getArray('setting') as YArray<{
    key: string,
    val: unknown
  }>)
  expect(kv.get('test-key')).toBe('test-value-2')
  const unsub = store.sub(testValueAtom, vi.fn())
  kv.set('test-key', 'test-value-3')
  kv.delete('test-key')
  await vi.waitFor(async () => {
    expect(await store.get(testValueAtom)).toBe('test-value')
  })
  unsub()
  await store.set(testValueAtom, 'test-value-2')
  expect(await store.get(testValueAtom)).toBe('test-value-2')
  await store.set(testValueAtom, RESET)
  expect(await store.get(testValueAtom)).toBe('test-value')
})

test('settingAtom with defaultValue', async () => {
  const store = getDefaultStore()
  const workspaceAtom = workspaceManager.getWorkspaceAtom('test-workspace')
  store.set(userInfoAtom, {
    username: 'testUser',
    id: 'test-user'
  })
  const testValueAtom = settingAtom(
    workspaceAtom,
    'test-key',
    'test-value'
  )
  await store.get(testValueAtom)
  const workspace = await store.get(workspaceAtom)
  const settingDoc = workspace.doc.getMap('settings').get('test-user') as Doc
  const kv = new YKeyValue(settingDoc.getArray('setting') as YArray<{
    key: string,
    val: unknown
  }>)
  expect(kv.get('test-key')).toBe(undefined)
  expect(await store.get(testValueAtom)).toBe('test-value')
  const unsub = store.sub(testValueAtom, vi.fn())
  await store.set(testValueAtom, 'test-value-2')
  expect(kv.get('test-key')).toBe('test-value-2')
  kv.delete('test-key')
  expect(await store.get(testValueAtom)).toBe('test-value')
  unsub()
})

test('settingAtom with defaultValue and reset', async () => {
  const store = getDefaultStore()
  const workspaceAtom = workspaceManager.getWorkspaceAtom('test-workspace')
  store.set(userInfoAtom, {
    username: 'testUser',
    id: 'test-user'
  })
  const testValueAtom = settingAtom(
    workspaceAtom,
    'test-key',
    'test-value'
  )
  const workspace = await store.get(workspaceAtom)
  const settingDoc = new Doc()
  workspace.doc.getMap('settings').set('test-user', settingDoc)
  const kv = new YKeyValue(settingDoc.getArray('setting') as YArray<{
    key: string,
    val: unknown
  }>)

  kv.set('test-key', 'test-value-2')
  const unsub = store.sub(testValueAtom, vi.fn())
  await vi.waitFor(async () => {
    expect(await store.get(testValueAtom)).toBe('test-value-2')
  })
  kv.set('test-key', 'test-value-3')
  await vi.waitFor(async () => {
    expect(await store.get(testValueAtom)).toBe('test-value-3')
  })
  unsub()
  await store.set(testValueAtom, RESET)
  await store.set(testValueAtom, () => RESET)
  expect(await store.get(testValueAtom)).toBe('test-value')
})

test('settingAtom with early un-sub', async () => {
  const store = getDefaultStore()
  const workspaceAtom = workspaceManager.getWorkspaceAtom('test-workspace')
  store.set(userInfoAtom, {
    username: 'testUser',
    id: 'test-user'
  })
  const testValueAtom = settingAtom(
    workspaceAtom,
    'test-key',
    'test-value'
  )
  const unsub = store.sub(testValueAtom, vi.fn())
  store.get(testValueAtom)
  unsub()
})
