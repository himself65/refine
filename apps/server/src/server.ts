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
  const docMap = new Map<string, Uint8Array>()

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
      const doc = docMap.get(guid)
      if (update === undefined) {
        if (doc) {
          socket.emit('update', guid, doc)
        }
      } else {
        if (doc) {
          try {
            update = diffUpdate(doc, update)
            docMap.set(guid, update)
            socket.emit('update', guid, update)
            socket.broadcast.emit('update', guid, update)
          } catch {
            docMap.set(guid, doc)
            socket.emit('update', guid, doc)
          }
        } else {
          try {
            decodeUpdate(update)
          } catch {
            // invalid update, just ignore
            return
          }
          docMap.set(guid, update)
          socket.broadcast.emit('update', guid, update)
        }
      }
    })

    socket.on('update', async (guid: string, update: Uint8Array) => {
      const doc = docMap.get(guid)
      if (!doc) {
        docMap.set(guid, update)
      } else {
        const newDoc = mergeUpdates([doc, update])
        docMap.set(guid, newDoc)
      }
      socket.broadcast.emit('update', guid, update)
    })
  })

  return { io, server }
}
