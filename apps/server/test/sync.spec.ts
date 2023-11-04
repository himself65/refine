import test, { type ExecutionContext } from 'ava'
import { createApp } from '@refine/server'
import type { AddressInfo } from 'node:net'
import { type Socket as ClientSocket } from 'socket.io-client'
import { type Socket as ServerSocket, Server as IOServer } from 'socket.io'
import type { Server } from 'node:http'
import {
  applyUpdate,
  diffUpdate,
  Doc,
  encodeStateVector
} from 'yjs'
import { createSocketPair } from './util.js'

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
    server.listen(async () => {
      port = (server.address() as AddressInfo).port
      const [cs, ss] = await createSocketPair(io, port)
      clientSocket = cs
      serverSocket = ss
      resolve()
    })
  })
})

test.afterEach(() => {
  io.close()
  server.close()
  clientSocket.disconnect()
})

test('should `/` work', async t => {
  const response = await fetch(`http://localhost:${port}/`, {
    method: 'GET'
  })
  const json = await response.json()
  t.deepEqual(json, { message: 'Hello world' })
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

async function waitForSYN (
  t: ExecutionContext,
  doc: Doc,
  socket: ClientSocket
) {
  return new Promise<void>(resolve => {
    socket.once('update', (guid: string, update: Uint8Array) => {
      if (guid === doc.guid) {
        const diff = diffUpdate(update, encodeStateVector(doc))
        t.deepEqual(diff, emptyDiff)
        resolve()
      }
    })
    socket.emit('diff', doc.guid)
  })
}

test('should work in sync provider with sub document', async (t) => {
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
  const { createSyncProvider } = await import('y-io/sync-provider')

  const provider = createSyncProvider(clientSocket, rootDoc)
  provider.connect()
  await waitForSYN(t, rootDoc, clientSocket)
  provider.disconnect()

  const [secondSocket] = await createSocketPair(io, port)
  return new Promise<void>(resolve => {
    secondSocket.once('update', (guid: string, update: Uint8Array) => {
      t.deepEqual(guid, 'root')
      const diff = diffUpdate(update, encodeStateVector(rootDoc))
      t.deepEqual(diff, emptyDiff)

      const newDoc = new Doc({
        guid: 'newRoot'
      })
      applyUpdate(newDoc, update)
      const pages = newDoc.getMap('pages')
      t.deepEqual([...pages.keys()], ['page0'])

      secondSocket.disconnect()
      resolve()
    })
    secondSocket.emit('diff', 'root')
  })
})

test('should work in sync provider with update', async (t) => {
  const { createSyncProvider } = await import('y-io/sync-provider')
  const pageDoc = new Doc({
    guid: 'page0'
  })
  {
    const blocksMap = pageDoc.getMap('blocks')
    blocksMap.set('block:0', 'test')
    const provider = createSyncProvider(clientSocket, pageDoc)
    provider.connect()
    await waitForSYN(t, pageDoc, clientSocket)
    provider.disconnect()
    clientSocket.disconnect()
  }
  {
    const [secondSocket] = await createSocketPair(io, port)
    const secondPageDoc = new Doc({
      guid: 'page0'
    })
    const provider = createSyncProvider(secondSocket, secondPageDoc)
    provider.connect()
    await waitForSYN(t, secondPageDoc, secondSocket)
    const blocksMap = secondPageDoc.getMap('blocks')
    t.deepEqual(blocksMap.toJSON(), {
      'block:0': 'test'
    })
  }
})
