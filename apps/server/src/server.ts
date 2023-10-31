import { createServer, type Server as HTTPServer } from 'node:http'
import express from 'express'
import { Server } from 'socket.io'
import { mergeUpdates } from 'yjs'

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

export function createApp (): HTTPServer {
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
    console.log('connected')
    socket.on('ping', () => {
      socket.emit('pong')
    })

    socket.on('diff', (guid: string) => {
      const doc = docMap.get(guid)
      if (doc) {
        socket.emit('diff', doc)
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
      const id = socket.id
      for (const socket of await io.sockets.fetchSockets()) {
        if (socket.id === id) {
          continue
        }
        socket.emit('update', guid, update)
      }
    })
  })

  return server
}
