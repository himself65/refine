import {
  decodeUpdate,
  decodeUpdateV2,
  Doc,
  encodeStateAsUpdate,
  encodeStateVector
} from 'yjs'

export function dumpDoc (doc: Doc): Map<string, Uint8Array> {
  const map = new Map<string, Uint8Array>()
  map.set(doc.guid, encodeStateAsUpdate(doc, encodeStateVector(doc)))
  for (const subdoc of doc.subdocs) {
    dumpDoc(subdoc).forEach((v, k) => map.set(k, v))
  }
  return map
}

function willMissingUpdateImpl (
  doc: Doc,
  update: Uint8Array,
  decode: typeof decodeUpdateV2 | typeof decodeUpdate
): false | Map<number, number> {
  const { structs } = decode(update)
  // clientId -> clock
  const missingMap = new Map<number, number>()

  // find if missing update in the structs
  for (let i = 0; i < structs.length; i++) {
    const struct = structs[i]
    const client = struct.id.client
    const items = doc.store.clients.get(client) ?? []
    const lastItem = items.at(-1)
    if (!lastItem) {
      if (struct.id.clock !== 0) {
        missingMap.set(client, struct.id.clock)
      }
      continue
    }
    const nextClock = lastItem.id.clock + lastItem.length
    if (nextClock < struct.id.clock) {
      missingMap.set(client, struct.id.clock)
    }
  }
  return missingMap.size > 0 ? missingMap : false
}

export function willMissingUpdate (
  doc: Doc, update: Uint8Array): false | Map<number, number> {
  return willMissingUpdateImpl(doc, update, decodeUpdate)
}

export function willMissingUpdateV2 (
  doc: Doc, update: Uint8Array): false | Map<number, number> {
  return willMissingUpdateImpl(doc, update, decodeUpdateV2)
}

export { createLazyProvider } from './lazy-provider'

export type {
  DataSourceAdapter,
  ProviderAdapter,
  Status,
  StatusAdapter
} from './type'
