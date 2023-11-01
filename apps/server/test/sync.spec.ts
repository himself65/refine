import test from 'ava'
import crypto from 'node:crypto'
import { createApp } from '@refine/server'
import type { AddressInfo } from 'node:net'
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client'
import { type Socket as ServerSocket, Server as IOServer } from 'socket.io'
import type { Server } from 'node:http'

let server: Server
let io: IOServer
let serverSocket: ServerSocket
let clientSocket: ClientSocket

test.beforeEach(async () => {
  await new Promise<void>(resolve => {
    const { io: _io, server: _server } = createApp()
    io = _io
    server = _server
    server.listen(() => {
      const port = (server.address() as AddressInfo).port
      const clientId = crypto.randomUUID()
      clientSocket = ioc(`http://localhost:${port}`, {
        query: {
          id: clientId
        }
      })
      io.on('connection', (socket) => {
        if (socket.handshake.query.id === clientId) {
          serverSocket = socket
          resolve()
        }
      })
      clientSocket.connect()
    })
  })
})

test.afterEach(() => {
  io.close()
  server.close()
  clientSocket.disconnect()
})

test('should basic ping/ping work', async t => {
  return new Promise<void>(resolve => {
    clientSocket.on('pong', () => {
      t.pass()
      resolve()
    })
    clientSocket.emit('ping')
  })
})

test('should work in DIY listener', (t) => {
  return new Promise<void>(resolve => {
    clientSocket.on('pong', () => {
      t.pass()
      resolve()
    })
    serverSocket.emit('pong')
  })
})
