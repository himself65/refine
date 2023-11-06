import { bindSyncServer } from '../src/server'
import { createSyncProvider } from '../src/sync-provider'
import { describe, test, vi, beforeEach, expect, afterEach } from 'vitest'
import { Server } from 'socket.io'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { io as ioc, Socket as ClientSocket } from 'socket.io-client'
import { diffUpdate, Doc, encodeStateVector } from 'yjs'
import { promisify } from 'node:util'

const sleep = promisify(setTimeout)

let io: Server
let port: number
let docUpdateMap: Map<string, Uint8Array>

beforeEach(async () => {
  const httpServer = createServer()
  io = new Server(httpServer)
  const { docUpdateMap: _docUpdateMap } = bindSyncServer(io)
  docUpdateMap = _docUpdateMap
  return new Promise<void>(resolve => {
    httpServer.listen(() => {
      port = (httpServer.address() as AddressInfo).port
      resolve()
    })
  })
})

afterEach(() => {
  io.close()
})

async function waitForSYN (
  doc: Doc,
  socket: ClientSocket
) {
  return new Promise<void>(resolve => {
    socket.once('update', (guid: string, update: Uint8Array) => {
      if (guid === doc.guid) {
        const diff = diffUpdate(update, encodeStateVector(doc))
        expect(diff).toEqual(new Uint8Array([0, 0]))
        resolve()
      }
    })
    socket.emit('diff', doc.guid)
  })
}

function createClient () {
  const socket = ioc(`http://localhost:${port}`)
  const doc = new Doc({
    guid: 'root'
  })
  return {
    socket,
    doc
  }
}

describe('createSyncProvider', () => {
  test('should empty document still empty', async () => {
    const {
      socket,
      doc
    } = createClient()
    const provider = createSyncProvider(socket, doc)
    const fn = vi.fn(() => {throw new Error('should not be called')})
    doc.on('update', fn)
    provider.connect()
    await sleep(100)
    provider.disconnect()
    expect(fn).toHaveBeenCalledTimes(0)

    doc.destroy()
    provider.disconnect()
  })

  test('should sync document', async () => {
    const { socket, doc } = createClient()
    const map = doc.getMap()
    map.set('foo', 'bar')
    const provider = createSyncProvider(socket, doc)
    provider.connect()
    await waitForSYN(doc, socket)
    const {
      socket: secondSocket,
      doc: secondDoc
    } = createClient()
    const secondMap = secondDoc.getMap()
    const secondProvider = createSyncProvider(secondSocket, secondDoc)
    expect(secondMap.get('foo')).toBeUndefined()
    secondProvider.connect()
    await waitForSYN(secondDoc, secondSocket)
    expect(secondMap.get('foo')).toBe('bar')

    provider.disconnect()
    secondProvider.disconnect()
    doc.destroy()
    secondDoc.destroy()
  })
})
