import type { Atom, PrimitiveAtom } from 'jotai/vanilla'
import type { MutableRefObject } from 'react'
import { useHydrateAtoms } from 'jotai/utils'
import { atomEffect } from 'jotai-effect'
import { useAtomValue } from 'jotai/react'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const effectWeakMap = new WeakMap<PrimitiveAtom<any>, Atom<void>>()

export function useInject<Value> (
  injectAtom: PrimitiveAtom<Value>,
  valueRef: MutableRefObject<Value>,
  updateValue: (apply: Value) => void
) {
  const currentValue = valueRef.current
  useHydrateAtoms([[injectAtom, currentValue]])
  if (!effectWeakMap.has(injectAtom)) {
    const originalWrite = injectAtom.write.bind(injectAtom)
    injectAtom.write = function (get, set, apply) {
      if (typeof apply === 'function') {
        originalWrite(get, set, apply)
      }
      updateValue(get(injectAtom))
      return
    }
    const effectAtom = atomEffect((get) => {
      const atomValue = get(injectAtom)
      const currentValue = valueRef.current
      if (atomValue !== currentValue) {
        updateValue(atomValue)
      }
    })
    effectWeakMap.set(injectAtom, effectAtom)
  }
  const effectAtom = effectWeakMap.get(injectAtom)!
  useAtomValue(injectAtom)
  useAtomValue(effectAtom)
}
