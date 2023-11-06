import { decodeUpdate, decodeUpdateV2, Doc } from 'yjs'

function willMissingUpdateImpl (
  doc: Doc,
  update: Uint8Array,
  decode: typeof decodeUpdateV2 | typeof decodeUpdate
): boolean {
  const decoded = decode(update)
  const futureItems = decoded.structs
  const clientDeleteSetMap = decoded.ds.clients
  const clients = [...clientDeleteSetMap.keys()]
  let findLost = false

  // find if missing update in the structs
  for (let i = 0; i < futureItems.length; i++) {
    const futureItem = futureItems[i]
    const client = futureItem.id.client
    const items = doc.store.clients.get(client) ?? []
    const lastItem = items.at(-1)
    if (!lastItem) {
      findLost = true
      continue
    }
    const nextClock = lastItem.id.clock + lastItem.length
    findLost ||= nextClock < futureItem.id.clock
  }

  // find if missing update in the ds
  for (let i = 0; i < clients.length; i++) {
    const client = clients[i]
    const deleteSet = clientDeleteSetMap.get(client) ?? []
    const items = doc.store.clients.get(client) ?? []
    const clocks = deleteSet.map(deleteItem => deleteItem.clock)
    const find = clocks.every(clock => {
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i]
        if (item.id.clock === clock) {
          return true
        }
      }
      return false
    })
    findLost ||= !find
  }
  return findLost
}

export function willMissingUpdate (doc: Doc, update: Uint8Array): boolean {
  return willMissingUpdateImpl(doc, update, decodeUpdate)
}

export function willMissingUpdateV2 (doc: Doc, update: Uint8Array): boolean {
  return willMissingUpdateImpl(doc, update, decodeUpdateV2)
}
