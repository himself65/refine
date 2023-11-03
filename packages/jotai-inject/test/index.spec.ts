import { test, expect } from 'vitest'
import { inject } from 'jotai-inject'
import { atom, getDefaultStore } from 'jotai/vanilla'

test('basic', () => {
  const a = atom(1)
  const updates: number[] = []
  inject(a, () => 2, (value) => {
    updates.push(value)
  })
  const store = getDefaultStore()
  store.set(a, 3)
  expect(updates.length).toBe(1)
  expect(updates[0]).toBe(3)
})
