import type { Socket } from 'socket.io-client'
import { applyUpdate, Doc, encodeStateVector, mergeUpdates } from 'yjs'

type SubdocEvent = {
  loaded: Set<Doc>;
  removed: Set<Doc>;
  added: Set<Doc>;
};
type OnUpdate = (update: Uint8Array, origin: unknown) => void
type OnDestroy = () => void
type OnSubDocs = (event: SubdocEvent) => void

const guidMap = new Map<string, Doc>()
const cacheMap = new Map<string, Uint8Array>()

export function createSyncProvider (socket: Socket, rootDoc: Doc) {
  const onUpdateMap = new WeakMap<Doc, OnUpdate>()
  const onDestroyMap = new WeakMap<Doc, OnDestroy>()
  const onSubDocsMap = new WeakMap<Doc, OnSubDocs>()

  socket.on('update', (guid: string, update: Uint8Array) => {
    let cache = cacheMap.get(guid)
    const doc = guidMap.get(guid)
    if (!doc) {
      if (cache) {
        cache = mergeUpdates([cache, update])
      } else {
        cache = update
      }
      cacheMap.set(guid, cache)
    } else {
      if (cache) {
        applyUpdate(doc, cache, `socket-${socket.id}`)
        cacheMap.delete(guid)
      }
      applyUpdate(doc, update, `socket-${socket.id}`)
    }
  })

  function setupDoc (doc: Doc) {
    const guid = doc.guid
    if (guidMap.has(guid)) throw new Error('Doc already setup')
    guidMap.set(guid, doc)

    const onUpdate: OnUpdate = (update, origin) => {
      socket.emit('update', update, `${origin}`)
    }
    onUpdateMap.set(doc, onUpdate)
    doc.on('update', onUpdate)

    const onDestroy: OnDestroy = () => {
      cleanupDoc(doc)
    }
    doc.once('destroy', onDestroy)
    onDestroyMap.set(doc, onDestroy)

    const onSubDocs: OnSubDocs = (event) => {
      for (const subdoc of event.added) {
        setupDoc(subdoc)
        updateDoc(subdoc)
      }
      for (const subdoc of event.removed) {
        cleanupDoc(subdoc)
      }
    }
    doc.on('subdocs', onSubDocs)
    onSubDocsMap.set(doc, onSubDocs)

    for (const subdoc of doc.getSubdocs()) {
      setupDoc(subdoc)
    }
  }

  function updateDoc (doc: Doc) {
    if (doc.shouldLoad) {
      socket.emit('diff', doc.guid, encodeStateVector(doc))
      for (const subdoc of doc.getSubdocs()) {
        updateDoc(subdoc)
      }
    }
  }

  function cleanupDoc (doc: Doc) {
    const guid = doc.guid
    if (!guidMap.has(guid)) throw new Error('Doc not setup')
    guidMap.delete(guid)

    const onUpdate = onUpdateMap.get(doc)
    if (onUpdate) {
      doc.off('update', onUpdate)
      onUpdateMap.delete(doc)
    }

    const onDestroy = onDestroyMap.get(doc)
    if (onDestroy) {
      doc.off('destroy', onDestroy)
      onDestroyMap.delete(doc)
    }

    const onSubDocs = onSubDocsMap.get(doc)
    if (onSubDocs) {
      doc.off('subdocs', onSubDocs)
      onSubDocsMap.delete(doc)
    }

    for (const subdoc of doc.getSubdocs()) {
      cleanupDoc(subdoc)
    }
  }

  return {
    connect: () => {
      setupDoc(rootDoc)
      updateDoc(rootDoc)
    },
    disconnect: () => {
      cleanupDoc(rootDoc)
    }
  }
}
