import { Workspace } from '@blocksuite/store'
import { Array as YArray, Doc } from 'yjs'
import { YKeyValue } from 'y-utility/y-keyvalue'
import { atom } from 'jotai/vanilla'
import { RESET } from 'jotai/utils'

function getWorkspacePreferenceDoc (
  workspace: Workspace,
  userId: string
) {
  const rootDoc = workspace.doc
  const settingsMap = rootDoc.getMap('settings')
  if (!settingsMap.has(userId)) {
    settingsMap.set(userId, new Doc({
      guid: crypto.randomUUID()
    }))
  }
  return settingsMap.get(userId) as Doc
}

function getSettingKV (
  workspace: Workspace,
  userId: string
) {
  const doc = getWorkspacePreferenceDoc(workspace, userId)
  const array = doc.getArray('setting') as YArray<{
    key: string,
    val: unknown
  }>
  return new YKeyValue(array)
}

type Changes<T> = Map<string, { action: 'delete', oldValue: T } | { action: 'update', oldValue: T, newValue: T } | { action: 'add', newValue: T }>

export function settingAtom<Value> (
  workspace: Workspace,
  userId: string,
  key: string,
  defaultValue: Value
) {
  const kv = getSettingKV(workspace, userId)
  const valueAtom = atom((kv.get(key) || defaultValue) as Value)

  valueAtom.onMount = set => {
    set((kv.get(key) as Value) || defaultValue)
    const onChange = (changes: Changes<unknown>) => {
      if (changes.has(key)) {
        const change = changes.get(key)!
        if (change.action === 'delete') {
          set(defaultValue)
        } else {
          set(change.newValue as Value)
        }
      }
    }
    kv.on('change', onChange)
    return () => {
      kv.off('change', onChange)
    }
  }

  return atom<
    Value,
    [Value | ((prev: Value) => Value) | typeof RESET],
    void
  >(
    (get) => get(valueAtom),
    (get, set, newValue) => {
      const oldValue = get(valueAtom)
      if (typeof newValue === 'function') {
        newValue = (newValue as (prev: Value) => Value)(oldValue)
      }
      if (newValue === oldValue) {
        return
      }
      if (newValue === RESET) {
        kv.delete(key)
        set(valueAtom, defaultValue)
      } else {
        kv.set(key, newValue)
        set(valueAtom, newValue)
      }
    }
  )
}

