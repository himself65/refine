import { createServer, type Server as HTTPServer } from 'node:http'
import express from 'express'
import { Server } from 'socket.io'
import { mergeUpdates, diffUpdate } from 'yjs'

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

    socket.on('diff', (guid: string, stateVector?: Uint8Array) => {
      const doc = docMap.get(guid)
      if (stateVector === undefined) {
        if (doc) {
          socket.emit('update', guid, doc)
        }
      } else if (doc) {
        const update = diffUpdate(doc, stateVector)
        docMap.set(guid, update)
        socket.emit('update', guid, update)
        socket.broadcast.emit('update', guid, update)
      } else {
        docMap.set(guid, stateVector)
        socket.broadcast.emit('update', guid, stateVector)
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
