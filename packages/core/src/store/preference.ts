import { Workspace } from '@blocksuite/store'
import { v5 } from 'uuid'
import { Array as YArray, Doc } from 'yjs'
import { YKeyValue } from 'y-utility/y-keyvalue'
import { type Atom, atom } from 'jotai/vanilla'
import { RESET } from 'jotai/utils'
import { userInfoAtom } from './api'
import { atomEffect } from 'jotai-effect'

const workspacePreferenceNamespace = '373a988e-670f-48ef-bacb-f345ae09ca24'

function getWorkspacePreferenceDocAtom (
  workspaceAtom: Atom<Promise<Workspace>>
) {
  return atom(async get => {
    const workspace = await get(workspaceAtom)
    const { id } = get(userInfoAtom)
    const rootDoc = workspace.doc
    const settingsMap = rootDoc.getMap('settings')
    if (!settingsMap.has(id)) {
      settingsMap.set(id, new Doc({
        guid: v5(id, workspacePreferenceNamespace)
      }))
    }
    return settingsMap.get(id) as Doc
  })
}

function getSettingKVAtom (
  workspaceAtom: Atom<Promise<Workspace>>
) {
  const targetDocAtom = getWorkspacePreferenceDocAtom(workspaceAtom)
  return atom(async get => {
    const doc = await get(targetDocAtom)
    const array = doc.getArray('setting') as YArray<{
      key: string,
      val: unknown
    }>
    return new YKeyValue(array)
  })
}

type Changes<T> = Map<string, { action: 'delete', oldValue: T } | { action: 'update', oldValue: T, newValue: T } | { action: 'add', newValue: T }>

export function settingAtom<Value> (
  workspaceAtom: Atom<Promise<Workspace>>,
  key: string,
  defaultValue: Value
) {
  const kvAtom = getSettingKVAtom(workspaceAtom)
  const primitiveAtom = atom<Value>(null as unknown as Value)

  const effectAtom = atomEffect((get, set) => {
    const abortController = new AbortController()
    get(kvAtom).then(kv => {
      const value = (kv.get(key) as Value) || defaultValue
      set(primitiveAtom, value)
      if (abortController.signal.aborted) {
        return
      }
      const onChange = (changes: Changes<unknown>) => {
        if (changes.has(key)) {
          const change = changes.get(key)!
          if (change.action === 'delete') {
            set(primitiveAtom, defaultValue)
          } else {
            set(primitiveAtom, change.newValue as Value)
          }
        }
      }
      kv.on('change', onChange)
      abortController.signal.addEventListener('abort', () => {
        kv.off('change', onChange)
      }, {
        once: true
      })
    })

    return () => {
      abortController.abort()
    }
  })

  return atom<
    Value | Promise<Value>,
    [Value | ((prev: Value) => Value | typeof RESET) | typeof RESET],
    Promise<void>
  >(
    async (get) => {
      get(effectAtom)
      if (get(primitiveAtom) !== null) {
        return get(primitiveAtom)
      } else {
        const kv = await get(kvAtom)
        if (kv.has(key)) {
          return kv.get(key) as Value
        } else {
          return defaultValue
        }
      }
    },
    async (get, set, newValue) => {
      const oldValue = get(primitiveAtom)
      if (typeof newValue === 'function') {
        newValue = (newValue as (prev: Value) => Value)(oldValue)
      }
      if (newValue === oldValue) {
        return
      }
      const kv = await get(kvAtom)
      if (newValue === RESET) {
        kv.delete(key)
        set(primitiveAtom, defaultValue)
      } else {
        kv.set(key, newValue)
        set(primitiveAtom, newValue)
      }
    }
  )
}

