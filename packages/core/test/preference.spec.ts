import { test, beforeAll, expect } from 'vitest'
import { settingAtom } from '../src/store/preference'
import { Schema, Workspace } from '@blocksuite/store'
import { AffineSchemas } from '@blocksuite/blocks/models'
import { getDefaultStore } from 'jotai/vanilla'
import type { Doc } from 'yjs'

const schema = new Schema()
beforeAll(() => {
  schema.register(AffineSchemas)
})

test('preference', async () => {
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
  const settingDoc = workspace.doc.getMap('settings').get('test-user') as Doc
  expect(settingDoc.getArray('setting').toJSON()).toMatchInlineSnapshot(`
    [
      {
        "key": "test-key",
        "val": "test-value-2",
      },
    ]
  `)
})
