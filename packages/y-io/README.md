# y-io

> Socket.io provider for Yjs in both client and server side.

## Feature

- socket.io based
- sub-document sync support
- easy to integrate with existing socket.io server
- update detection (won't break the existing data)
- multiple clients syncing
- TypeScript & 100% code coverage
- End-to-end encryption (WIP)

## Usage

### Server

```ts
import { bindSyncServer } from 'y-io/server'
import { createServer } from 'node:http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
})
bindSyncServer(io)

httpServer.listen(1234)
```

### Client

```ts
import { createSyncProvider } from 'y-io/sync-provider'
import { Doc } from 'yjs'

const doc = new Doc({
  guid: 'some-unique-id'
})

const socket = io('http://localhost:1234')
const provider = createSyncProvider(socket, doc)
provider.connect()

provider.disconnect()
```

## LICENSE

[MIT](../../LICENSE)
