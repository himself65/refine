import test from 'ava'
import crypto from 'node:crypto'
import { createApp } from '@refine/server'
import type { AddressInfo } from 'node:net'
import { promisify } from 'node:util'
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client'
import { type Socket as ServerSocket, Server as IOServer } from 'socket.io'
import type { Server } from 'node:http'
import { diffUpdate, Doc, encodeStateAsUpdate } from 'yjs'

const timeout = promisify(setTimeout)

const emptyDiff = new Uint8Array([0, 0])

let port: number
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
      port = (server.address() as AddressInfo).port
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

test('should work in sync provider', async (t) => {
  const rootDoc = new Doc({
    guid: 'root'
  })
  const pages = rootDoc.getMap('pages')
  const pageDoc = new Doc({
    guid: 'page0'
  })
  pages.set('page0', pageDoc)
  const blocksMap = pageDoc.getMap('blocks')
  blocksMap.set('block:0', 'test')
  const { createSyncProvider } = await import('@refine/server/sync-provider')

  const provider = createSyncProvider(clientSocket, rootDoc)
  provider.connect()
  await timeout(1000)

  const secondSocket = ioc(`http://localhost:${port}`)
  secondSocket.connect()
  return new Promise<void>(resolve => {
    secondSocket.once('update', (guid: string, update: Uint8Array) => {
      t.deepEqual(guid, 'root')
      const diff = diffUpdate(encodeStateAsUpdate(rootDoc), update)
      t.deepEqual(diff, emptyDiff)
      resolve()
    })
    secondSocket.emit('diff', 'root')
  })
})
