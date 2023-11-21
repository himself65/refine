import { createServer, type Server as HTTPServer } from 'node:http'
import { createAdaptorServer } from '@hono/node-server'
import { Hono } from 'hono'
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
  const app = new Hono()
  const server = createAdaptorServer({
    createServer,
    fetch: app.fetch
  }) as HTTPServer

  app.get('/', (context) => context.json({
    message: 'Hello world'
  }))

  const io = new Server(server, {
    cors: {
      origin: '*'
    }
  })

  bindSyncServer(io)
  io.on('connection', (socket) => {
    socket.on('ping', () => {
      socket.emit('pong')
    })
  })

  return { io, server }
}
