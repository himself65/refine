import { createServer, type Server as HTTPServer } from 'node:http'
import express from 'express'
import { Server } from 'socket.io'
import { mergeUpdates, diffUpdate, decodeUpdate } from 'yjs'

declare module 'socket.io' {
  /**
   * Data related to yjs
   */
  interface SocketContext {
    workspaceId: string
    clientId: number
  }

  interface Socket {
    context: SocketContext
  }
}

export function createApp (): {
  io: Server
  server: HTTPServer
} {
  const app = express()

  app.get('/', (_, res) => {
    res.json({ message: 'Hello world' }).end()
  })

  // server doesn't hold the instance of yjs document
  const docUpdateMap = new Map<string, Uint8Array>()

  const server = createServer(app)
  const io = new Server(server, {
    cors: {
      origin: '*'
    }
  })

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

  return { io, server }
}
