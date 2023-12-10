/// Credit: https://github.com/toeverything/AFFiNE/tree/559ec3956f643d00d47fead8728e9b587f68b625/packages/common/y-provider
import {
  applyUpdate,
  type Doc,
  encodeStateAsUpdate,
  encodeStateVector
} from 'yjs'
import {
  DataSourceAdapter,
  ProviderAdapter,
  Status,
  StatusAdapter
} from './type.js'
import { assertExists } from './utils.js'

// perf: need memorization here
function queryDoc (doc: Doc, guid: string): Doc | undefined {
  if (doc.guid === guid) {
    return doc
  }
  for (const subdoc of doc.subdocs) {
    const found = queryDoc(subdoc, guid)
    if (found) {
      return found
    }
  }
  return undefined
}

interface LazyProviderOptions {
  author?: string;
}

/**
 * Creates a lazy provider that connects to a datasource and synchronizes a root document.
 */
export const createLazyProvider = (
  rootDoc: Doc,
  datasource: DataSourceAdapter,
  options: LazyProviderOptions = {}
): ProviderAdapter & StatusAdapter => {
  let connected = false
  const pendingMap = new Map<string, Uint8Array[]>() // guid -> pending-updates
  const disposableMap = new Map<string, Set<() => void>>()
  const connectedDocs = new Set<string>()
  let abortController: AbortController | null = null

  const { author = 'unknown-provider' } = options

  let currentStatus: Status = {
    type: 'idle'
  }
  let syncingStack = 0
  const callbackSet = new Set<() => void>()
  const changeStatus = (newStatus: Status) => {
    // simulate a stack, each syncing and synced should be paired
    if (newStatus.type === 'syncing') {
      syncingStack++
    } else if (newStatus.type === 'synced' || newStatus.type === 'error') {
      syncingStack--
    }

    if (syncingStack < 0) {
      console.error(
        'syncingStatus < 0, this should not happen',
        author
      )
    }

    if (syncingStack === 0) {
      currentStatus = newStatus
    }
    if (newStatus.type !== 'synced') {
      currentStatus = newStatus
    }
    if (syncingStack === 0) {
      if (!connected) {
        currentStatus = {
          type: 'idle'
        }
      } else {
        currentStatus = {
          type: 'synced'
        }
      }
    }
    callbackSet.forEach(cb => cb())
  }

  async function syncDoc (doc: Doc) {
    const guid = doc.guid
    if (!connected) {
      return
    }

    changeStatus({
      type: 'syncing'
    })
    const remoteUpdate = await datasource.queryDocState(guid, {
      stateVector: encodeStateVector(doc),
      author
    }).then(remoteUpdate => {
      changeStatus({
        type: 'synced'
      })
      return remoteUpdate
    }).catch(error => {
      changeStatus({
        type: 'error',
        error
      })
      throw error
    })

    pendingMap.set(guid, [])

    if (remoteUpdate.missingUpdate.length > 0) {
      applyUpdate(doc, remoteUpdate.missingUpdate, author)
    }

    if (!connected) {
      return
    }

    // perf: optimize me
    // it is possible the doc is only in memory but not yet in the datasource
    // we need to send the whole update to the datasource
    await datasource.sendDocUpdate(
      guid,
      encodeStateAsUpdate(doc,
        remoteUpdate ? remoteUpdate.stateVector : undefined),
      author
    )

    doc.emit('sync', [])
  }

  function setupDocListener (rootDoc: Doc) {
    const disposables = new Set<() => void>()
    disposableMap.set(rootDoc.guid, disposables)
    const updateHandler = async (update: Uint8Array, updateOrigin: unknown) => {
      if (author === updateOrigin) {
        return
      }
      changeStatus({
        type: 'syncing'
      })
      datasource.sendDocUpdate(rootDoc.guid, update,
        typeof updateOrigin === 'string' ? updateOrigin : 'unknown-origin').
        then(() => {
          changeStatus({
            type: 'synced'
          })
        }).
        catch(error => {
          changeStatus({
            type: 'error',
            error
          })
          console.error(error)
        })
    }

    const subdocsHandler = (event: {
      loaded: Set<Doc>;
      removed: Set<Doc>;
      added: Set<Doc>;
    }) => {
      event.loaded.forEach(subdoc => {
        connectDoc(subdoc).catch(console.error)
      })
      event.removed.forEach(subdoc => {
        disposeDoc(subdoc)
      })
    }

    const destroyHandler = () => {
      disposeDoc(rootDoc)
    }

    rootDoc.on('update', updateHandler)
    rootDoc.on('subdocs', subdocsHandler)
    rootDoc.once('destroy', destroyHandler)
    disposables.add(() => {
      rootDoc.off('update', updateHandler)
      rootDoc.off('subdocs', subdocsHandler)
      rootDoc.off('destroy', destroyHandler)
    })
  }

  function setupDatasourceListeners () {
    assertExists(abortController, 'abortController should be defined')
    const unsubscribe = datasource.onDocUpdate?.((guid, update) => {
      changeStatus({
        type: 'syncing'
      })
      const doc = queryDoc(rootDoc, guid)
      if (doc) {
        applyUpdate(doc, update, author)
        if (pendingMap.has(guid)) {
          pendingMap.get(guid)?.
            forEach(update => applyUpdate(doc, update, author))
          pendingMap.delete(guid)
        }
      } else {
        // This case happens when the father doc is not yet updated,
        //  so that the child doc is not yet created.
        //  We need to put it into cache so that it can be applied later.
        console.warn('doc not found', guid)
        pendingMap.set(guid, (pendingMap.get(guid) ?? []).concat(update))
      }
      changeStatus({
        type: 'synced'
      })
    })
    abortController.signal.addEventListener('abort', () => {
      unsubscribe?.()
    })
  }

  // when a subdoc is loaded, we need to sync it with the datasource and setup listeners
  async function connectDoc (doc: Doc) {
    // skip if already connected
    if (connectedDocs.has(doc.guid)) {
      return
    }
    connectedDocs.add(doc.guid)
    setupDocListener(doc)
    await syncDoc(doc)

    await Promise.all(
      [...doc.subdocs].filter(subdoc => subdoc.shouldLoad).
        map(subdoc => connectDoc(subdoc))
    )
  }

  function disposeDoc (doc: Doc) {
    connectedDocs.delete(doc.guid)
    const disposables = disposableMap.get(doc.guid)
    if (disposables) {
      disposables.forEach(dispose => dispose())
      disposableMap.delete(doc.guid)
    }
    // also dispose all subdocs
    doc.subdocs.forEach(disposeDoc)
  }

  function disposeAll () {
    disposableMap.forEach(disposables => {
      disposables.forEach(dispose => dispose())
    })
    disposableMap.clear()
    connectedDocs.clear()
  }

  /**
   * Connects to the datasource and sets up event listeners for document updates.
   */
  function connect () {
    connected = true
    abortController = new AbortController()

    changeStatus({
      type: 'syncing'
    })
    // root doc should be already loaded,
    // but we want to populate the cache for later update events
    connectDoc(rootDoc).then(() => {
      changeStatus({
        type: 'synced'
      })
    }).catch(error => {
      changeStatus({
        type: 'error',
        error
      })
      console.error(error)
    })
    setupDatasourceListeners()
  }

  async function disconnect () {
    connected = false
    disposeAll()
    assertExists(abortController, 'abortController should be defined')
    abortController.abort()
    abortController = null
  }

  const syncDocRecursive = async (doc: Doc) => {
    await syncDoc(doc)
    await Promise.all(
      [...doc.subdocs.values()].map(subdoc => syncDocRecursive(subdoc))
    )
  }

  return {
    //#region status adapter
    getStatus () {
      return currentStatus
    },
    onStatusChange (cb: () => void) {
      callbackSet.add(cb)
      return () => {
        callbackSet.delete(cb)
      }
    },
    //#endregion
    //#region provider adapter
    sync: async onlyRootDoc => {
      connected = true
      try {
        if (onlyRootDoc) {
          await syncDoc(rootDoc)
        } else {
          await syncDocRecursive(rootDoc)
        }
      } finally {
        connected = false
      }
    },
    getConnected (): boolean {
      return connected
    },
    connect,
    disconnect
    //#endregion
  }
}
