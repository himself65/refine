import { test, expect, vi } from 'vitest'
import { inject, useInject } from '../src'
import { atom, getDefaultStore } from 'jotai/vanilla'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { useAtomValue } from 'jotai/react'

test('inject', () => {
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

test('useInject', async () => {
  const store = getDefaultStore()
  const a = atom(1)
  const fn = vi.fn()
  const App = () => {
    const [num, setNum] = useState(0)
    useInject(a, num, fn)
    const value = useAtomValue(a)
    return (
      <div>
        <button
          data-testid="btn"
          onClick={() => setNum(num => num + 1)}
        >
          Plus
        </button>
        <div data-testid="value">
          {value}
        </div>
      </div>
    )
  }
  render(<App/>)
  expect(fn).toBeCalledTimes(0)
  await userEvent.click(screen.getByTestId('btn'))
  await userEvent.click(screen.getByTestId('btn'))
  expect(fn).toBeCalledTimes(2)
  const value = store.get(a)
  expect(value).toBe(2)
  expect(screen.getByTestId<HTMLDivElement>('value').textContent).toBe('2')
})
