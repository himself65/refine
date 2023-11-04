import { createServer, type Server as HTTPServer } from 'node:http'
import express from 'express'
import { Server } from 'socket.io'
import { bindSyncServer } from 'y-io/server'

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

  const server = createServer(app)
  const io = new Server(server, {
    cors: {
      origin: '*'
    }
  })

  bindSyncServer(io)

  return { io, server }
}
