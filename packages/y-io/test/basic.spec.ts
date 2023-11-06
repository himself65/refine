import { bindSyncServer } from '../src/server'
import { createSyncProvider } from '../src/sync-provider'
import { describe, test, vi, beforeEach, expect, afterEach } from 'vitest'
import { Server } from 'socket.io'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { io as ioc, Socket as ClientSocket } from 'socket.io-client'
import {
  applyUpdate,
  diffUpdate,
  Doc, encodeStateAsUpdate,
  encodeStateVector
} from 'yjs'
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

describe('sync provider', () => {
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

    provider.disconnect()
    socket.disconnect()
    doc.destroy()
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
    socket.disconnect()
    secondSocket.disconnect()
    doc.destroy()
    secondDoc.destroy()
  })

  test('should sync document in duplex', async () => {
    const { socket, doc } = createClient()
    const map = doc.getMap()
    const provider = createSyncProvider(socket, doc)
    const { socket: secondSocket, doc: secondDoc } = createClient()
    const secondMap = secondDoc.getMap()
    const secondProvider = createSyncProvider(secondSocket, secondDoc)

    provider.connect()
    secondProvider.connect()
    map.set('foo', 'bar')
    await vi.waitFor(() => {
      expect(secondMap.get('foo')).toBe('bar')
    })
    secondMap.set('foo', 'bar2')
    await vi.waitFor(() => {
      expect(map.get('foo')).toBe('bar2')
    })

    const update = docUpdateMap.get(doc.guid) as Uint8Array
    expect(update).toBeDefined()
    {
      const doc = new Doc({
        guid: 'new'
      })
      applyUpdate(doc, update)
      const map = doc.getMap()
      expect(map.get('foo')).toBe('bar2')
    }

    provider.disconnect()
    secondProvider.disconnect()
    socket.disconnect()
    secondSocket.disconnect()
    doc.destroy()
    secondDoc.destroy()
  })

  test('should sync sub document and multiple provider in duplex', async () => {
    const { socket, doc } = createClient()
    const subDoc = new Doc({
      guid: 'sub-doc1'
    })
    const map = doc.getMap()
    map.set('1', subDoc)
    const provider = createSyncProvider(socket, doc)
    provider.connect()
    await waitForSYN(doc, socket)
    const {
      socket: secondSocket,
      doc: secondDoc
    } = createClient()
    const secondMap = secondDoc.getMap()
    expect(secondMap.get('1')).toBeUndefined()
    const secondProvider = createSyncProvider(secondSocket, secondDoc)
    secondProvider.connect()
    await waitForSYN(secondDoc, secondSocket)
    const secondSubDoc = secondMap.get('1') as Doc
    expect(secondSubDoc).toBeInstanceOf(Doc)

    {
      subDoc.getMap().set('foo', 'bar')
      await vi.waitFor(() => {
        expect(secondSubDoc.getMap().get('foo')).toBe('bar')
      })
      secondSubDoc.getMap().set('foo', 'bar2')
      await vi.waitFor(() => {
        expect(subDoc.getMap().get('foo')).toBe('bar2')
      })
    }

    {
      map.delete('1')
      subDoc.getMap().set('foo', 'bar3')
      await vi.waitFor(() => {
        expect(secondMap.get('1')).toBeUndefined()
      })
      expect(secondSubDoc.getMap().get('foo')).toBe('bar2')
      const p1 = createSyncProvider(socket, subDoc)
      const p2 = createSyncProvider(secondSocket, secondSubDoc)
      expect(subDoc.getMap().get('foo')).toBe('bar3')
      expect(secondSubDoc.getMap().get('foo')).toBe('bar2')
      p1.connect()
      p2.connect()
      await vi.waitFor(() => {
        expect(subDoc.getMap().get('foo')).toBe('bar3')
      })

      p1.disconnect()
      p2.disconnect()
    }

    provider.disconnect()
    secondProvider.disconnect()
    socket.disconnect()
    secondSocket.disconnect()
    doc.destroy()
    secondDoc.destroy()
  })
})

describe('edge cases', () => {
  test('wrong update/diff', async () => {
    const { socket, doc } = createClient()
    const provider = createSyncProvider(socket, doc)
    const { socket: secondSocket, doc: secondDoc } = createClient()
    const secondProvider = createSyncProvider(secondSocket, secondDoc)
    provider.connect()
    secondProvider.connect()
    const fn = vi.fn((guid: string, update: Uint8Array) => {
      expect(guid).toBe(doc.guid)
      expect(update).toBeInstanceOf(Uint8Array)
    })
    secondSocket.once('update', fn)
    doc.getMap().set('foo', 'bar')
    expect(doc.getMap().get('foo')).toBe('bar')
    await vi.waitFor(() => {
      expect(secondDoc.getMap().get('foo')).toBe('bar')
    })
    provider.disconnect()
    // wrong emit
    const onError = vi.fn((...args: any[]) => {
      expect(args[0]).toBe('invalid update')
    })
    vi.stubGlobal('console', {
      error: onError
    })
    expect(onError).toHaveBeenCalledTimes(0)
    socket.emit('update', -1, new Uint8Array([0, 1, 2]))
    socket.emit('update', 'wrong-id', new Uint8Array([0, 1, 2]))
    socket.emit('update', undefined, undefined)
    socket.emit('update', undefined, new Uint8Array([0, 1, 2]))
    socket.emit('update', {}, {})
    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(5)
    })

    doc.getMap().set('foo', 'hello world')
    const update = encodeStateAsUpdate(doc)
    // manually emit update
    socket.emit('update', doc.guid, update)
    await vi.waitFor(() => {
      expect(secondDoc.getMap().get('foo')).toBe('hello world')
    })

    socket.emit('diff', -1, new Uint8Array([0, 1, 2]))
    socket.emit('diff', 'wrong-id', new Uint8Array([0, 1, 2]))
    socket.emit('diff', undefined, undefined)
    socket.emit('diff', undefined, new Uint8Array([0, 1, 2]))
    socket.emit('diff', {}, {})
    socket.emit('diff', doc.guid, new Uint8Array([0, 1, 2]))
    socket.emit('diff', doc.guid, 'not-update')

    const onSocketUpdate = vi.fn((guid: string, update: Uint8Array) => {
      expect(guid).toBe(doc.guid)
      expect(update).toBeInstanceOf(Uint8Array)
      const testDoc = new Doc({
        guid: 'test'
      })
      applyUpdate(testDoc, update)
      expect(testDoc.getMap().get('foo')).toBe('hello world')
    })
    socket.once('update', onSocketUpdate)
    socket.emit('diff', doc.guid)
    expect(onSocketUpdate).toHaveBeenCalledTimes(0)
    await vi.waitFor(() => {
      expect(onSocketUpdate).toHaveBeenCalledTimes(1)
    })

    vi.unstubAllGlobals()
    provider.disconnect()
    secondProvider.disconnect()
    socket.disconnect()
    secondSocket.disconnect()
    doc.destroy()
    secondDoc.destroy()
  })
})
