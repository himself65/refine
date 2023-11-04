import { type Server } from 'socket.io'
import { decodeUpdate, diffUpdate, mergeUpdates } from 'yjs'

export function bindSyncServer (
  io: Server
) {
  const docUpdateMap = new Map<string, Uint8Array>()
  io.on('connection', (socket) => {
    socket.on('ping', () => {
      socket.emit('pong')
    })

    socket.on('diff', (guid: string, update?: Uint8Array) => {
      try {
        update && decodeUpdate(update)
      } catch {
        update = undefined
      }

      const docUpdate = docUpdateMap.get(guid)
      if (update === undefined) {
        if (docUpdate) {
          console.log('diff 1', decodeUpdate(docUpdate))
          socket.emit('update', guid, docUpdate)
        }
      } else {
        if (docUpdate) {
          try {
            console.log('diff 2', update, docUpdate)
            update = diffUpdate(docUpdate, update)
            console.log('result', update)
            docUpdateMap.set(guid, update)
            socket.emit('update', guid, update)
            socket.broadcast.emit('update', guid, update)
          } catch {
            docUpdateMap.set(guid, docUpdate)
            console.log('diff 3', decodeUpdate(docUpdate))
            socket.emit('update', guid, docUpdate)
          }
        } else {
          try {
            decodeUpdate(update)
          } catch {
            // invalid update, just ignore
            return
          }
          docUpdateMap.set(guid, update)
          socket.broadcast.emit('update', guid, update)
        }
      }
    })

    socket.on('update', async (guid: string, update: Uint8Array) => {
      try {
        decodeUpdate(update)
      } catch {
        console.error('invalid update', guid, update)
        return
      }
      const doc = docUpdateMap.get(guid)
      if (!doc) {
        docUpdateMap.set(guid, update)
      } else {
        const newDoc = mergeUpdates([doc, update])
        docUpdateMap.set(guid, newDoc)
      }
      socket.broadcast.emit('update', guid, update)
    })
  })
  return {
    docUpdateMap
  }
}
