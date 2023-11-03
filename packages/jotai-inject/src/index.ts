import type { PrimitiveAtom } from 'jotai/vanilla'
import { useHydrateAtoms } from 'jotai/utils'
import { useState } from 'react'
import { useSetAtom } from 'jotai/react'

export function inject<
  Value
> (
  injectAtom: PrimitiveAtom<Value> & { init: Value | Promise<Value> },
  accessor: () => (Value | Promise<Value>),
  updateValue: (apply: Value) => void
) {
  const originalWrite = injectAtom.write.bind(injectAtom)
  injectAtom.init = accessor()
  injectAtom.write = function (get, set, apply) {
    originalWrite(get, set, apply)
    updateValue(get(injectAtom))
    return
  }
}

type UpdateValue<Value> = (newValue: Value) => void

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const weakMap = new WeakMap<PrimitiveAtom<any>, UpdateValue<any>>()

export function useInject<Value> (
  injectAtom: PrimitiveAtom<Value>,
  value: Value,
  updateValue: UpdateValue<Value>
) {
  const [oldValue, setOldValue] = useState(value)
  useHydrateAtoms([[injectAtom, value]])
  if (!weakMap.has(injectAtom)) {
    const originalWrite = injectAtom.write.bind(injectAtom)
    injectAtom.write = function (get, set, apply) {
      originalWrite(get, set, apply)
      updateValue(get(injectAtom))
      return
    }
    weakMap.set(injectAtom, updateValue)
  }

  const setAtom = useSetAtom(injectAtom)
  if (oldValue !== value) {
    setOldValue(value)
    setAtom(value)
  }

  if (weakMap.get(injectAtom) !== updateValue) {
    weakMap.set(injectAtom, updateValue)
  }
}
