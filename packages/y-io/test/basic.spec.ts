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
import { willMissingUpdate } from 'y-utils'

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

async function waitSocketUpdateOnce (socket: ClientSocket) {
  return new Promise<void>(resolve => {
    socket.once('update', () => {
      resolve()
    })
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

    secondProvider.disconnect()
    secondProvider.connect()
    secondProvider.connect()

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
  test('should works when wrong update/diff', async () => {
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
    const onError = vi.fn((...args: unknown[]) => {
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
    socket.emit('diff', doc.guid, new Uint8Array([255, 255, 255]))
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

  test('should cache the update even doesn\'t listen the document',
    async () => {
      const { socket, doc } = createClient()
      const provider = createSyncProvider(socket, doc)
      provider.connect()
      await waitForSYN(doc, socket)
      const { socket: secondSocket, doc: secondDoc } = createClient()
      const secondProvider = createSyncProvider(secondSocket, secondDoc)
      await waitForSYN(secondDoc, secondSocket)
      doc.getMap().set('foo', 'bar')
      secondProvider.connect()
      doc.getMap().set('foo', 'bar2')
      await vi.waitFor(() => {
        expect(secondDoc.getMap().get('foo')).toBe('bar2')
      })
      secondProvider.disconnect()
      doc.getMap().set('foo', 'bar3')
      secondProvider.connect()
      await vi.waitFor(() => {
        expect(secondDoc.getMap().get('foo')).toBe('bar3')
      })

      secondProvider.disconnect()
      secondSocket.disconnect()
      provider.disconnect()
      socket.disconnect()
      doc.destroy()
      secondDoc.destroy()
    })

  test('should works with only sockets', async () => {
    const { socket, doc } = createClient()
    const { socket: secondSocket, doc: secondDoc } = createClient()
    doc.getMap().set('foo', 'bar')
    secondSocket.on('update', (guid: string, update: Uint8Array) => {
      expect(guid).toBe(doc.guid)
      applyUpdate(secondDoc, update)
    })
    socket.emit('update', doc.guid, encodeStateAsUpdate(doc))
    await vi.waitFor(() => {
      expect(secondDoc.getMap().get('foo')).toBe('bar')
    })

    socket.disconnect()
    secondSocket.disconnect()
    doc.destroy()
    secondDoc.destroy()
  })

  test('should missing update will not break the doc', async () => {
    const { socket, doc } = createClient()
    const { socket: secondSocket, doc: secondDoc } = createClient()
    const secondProvider = createSyncProvider(secondSocket, secondDoc)
    secondProvider.connect()
    const updates: Uint8Array[] = []
    doc.on('update', (update: Uint8Array) => {
      expect(willMissingUpdate(doc, update)).toBe(false)
      updates.push(update)
    })
    const map = doc.getMap()
    map.set('x', 1)
    map.set('y', 2)
    expect(updates.length).toBe(2)
    socket.emit('update', doc.guid, updates[0])
    socket.emit('update', doc.guid, updates[1])
    await vi.waitFor(() => {
      expect(secondDoc.getMap().get('x')).toBe(1)
      expect(secondDoc.getMap().get('y')).toBe(2)
    })
    map.set('x', 3)
    map.set('y', 4)
    expect(updates.length).toBe(4)
    socket.emit('update', doc.guid, updates[3])
    const onWarn = vi.fn((...args: unknown[]) => {
      expect(args[0]).toBe('detected missing update from clients:')
      expect(args[1]).toBe(doc.clientID)
    })
    vi.stubGlobal('console', {
      warn: onWarn
    })
    await waitSocketUpdateOnce(secondSocket)
    expect(secondDoc.getMap().get('x')).toBe(1)
    expect(secondDoc.getMap().get('y')).toBe(2)
    expect(onWarn).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })
})
