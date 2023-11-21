import type { PrimitiveAtom } from 'jotai/vanilla'

export function inject<
  Value
> (
  injectAtom: PrimitiveAtom<Value> & { init: Value | Promise<Value> },
  accessor: () => (Value | Promise<Value>),
  updateValue?: (apply: Value) => void
) {
  const originalWrite = injectAtom.write.bind(injectAtom)
  injectAtom.init = accessor()
  injectAtom.write = function (get, set, apply) {
    originalWrite(get, set, apply)
    updateValue?.(get(injectAtom))
    return
  }
}
