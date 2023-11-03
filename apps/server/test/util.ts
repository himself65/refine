import { Server as IOServer, Socket as ServerSocket } from 'socket.io'
import { io as ioc, Socket as ClientSocket } from 'socket.io-client'
import crypto from 'node:crypto'

export async function createSocketPair (
  io: IOServer, port: number): Promise<
  [
    clientSocket: ClientSocket,
    serverSocket: ServerSocket
  ]
> {
  const clientId = crypto.randomUUID()
  const clientSocket = ioc(`http://localhost:${port}`, {
    query: {
      id: clientId
    }
  })
  return new Promise((resolve) => {
    const handler = (socket: ServerSocket) => {
      if (socket.handshake.query.id === clientId) {
        resolve([clientSocket, socket])
      }
      io.off('connection', handler)
    }
    io.on('connection', handler)
    clientSocket.connect()
  })
}
