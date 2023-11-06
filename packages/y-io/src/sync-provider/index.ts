import type { Socket } from 'socket.io-client'
import {
  applyUpdate, diffUpdate,
  Doc,
  encodeStateAsUpdate, encodeStateVector,
  mergeUpdates
} from 'yjs'
import { willMissingUpdate } from 'y-utils'

type SubdocEvent = {
  loaded: Set<Doc>;
  removed: Set<Doc>;
  added: Set<Doc>;
};
type OnUpdate = (update: Uint8Array, origin: unknown) => void
type OnDestroy = () => void
type OnSubDocs = (event: SubdocEvent) => void

export function createSyncProvider (socket: Socket, rootDoc: Doc) {
  const guidMap = new Map<string, Doc>()
  const cacheMap = new Map<string, Uint8Array>()
  const onUpdateMap = new WeakMap<Doc, OnUpdate>()
  const onDestroyMap = new WeakMap<Doc, OnDestroy>()
  const onSubDocsMap = new WeakMap<Doc, OnSubDocs>()

  function onSocketUpdate (guid: string, _update: ArrayBuffer) {
    let update = new Uint8Array(_update)
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
        update = mergeUpdates([cache, update])
        cacheMap.delete(guid)
      }
      const missing = willMissingUpdate(doc, update)
      if (missing === false) {
        applyUpdate(doc, update, `socket-${socket.id}`)
      } else {
        const fakeDoc = new Doc()
        const docUpdate = encodeStateAsUpdate(doc)
        applyUpdate(fakeDoc, docUpdate)
        applyUpdate(fakeDoc, update)
        const stateVector = encodeStateVector(fakeDoc)
        const diff = diffUpdate(docUpdate, stateVector)
        applyUpdate(doc, diff, `socket-${socket.id}`)
        fakeDoc.destroy()

        cacheMap.set(guid, diffUpdate(update, stateVector))
        console.warn('detected missing update from clients:', ...missing.keys())
        // there is no way
        //  to know if the missing update still exists in the network
      }
    }
  }

  socket.on('update', onSocketUpdate)

  function setupDoc (doc: Doc) {
    const guid = doc.guid
    if (guidMap.has(guid)) {
      return
    }
    guidMap.set(guid, doc)

    const onUpdate: OnUpdate = (update) => {
      socket.emit('update', doc.guid, update)
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
      socket.once('update', (guid: string) => {
        if (guid === doc.guid) {
          for (const subdoc of doc.getSubdocs()) {
            updateDoc(subdoc)
          }
        }
      })
      socket.emit('diff', doc.guid, encodeStateAsUpdate(doc))
      for (const subdoc of doc.getSubdocs()) {
        updateDoc(subdoc)
      }
    }
  }

  function cleanupDoc (doc: Doc) {
    const guid = doc.guid
    if (!guidMap.has(guid)) {
      return
    }
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
