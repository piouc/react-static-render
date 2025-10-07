import { WebSocketServer, WebSocket } from 'ws'
import { createServer, Server } from 'http'
import { RenderConfig } from './config.js'

interface LiveReloadMessage {
  readonly type: 'reload' | 'ping' | 'pong'
  readonly data?: Record<string, unknown>
}

interface ServerOptions {
  readonly port: number
  readonly host?: string
}

export class LiveReloadServer {
  private wss: WebSocketServer | null = null
  private server: Server | null = null
  private readonly config: RenderConfig
  private readonly connectedClients = new Set<WebSocket>()

  constructor(config: RenderConfig) {
    this.config = config
  }

  start(): void {
    if (this.wss) {
      return
    }

    this.server = createServer()
    this.wss = new WebSocketServer({ server: this.server })

    this.wss.on('connection', (ws: WebSocket) => {
      this.connectedClients.add(ws)
      
      ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error)
        this.connectedClients.delete(ws)
      })
      
      ws.on('close', () => {
        this.connectedClients.delete(ws)
      })
      
      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, data)
      })
    })

    const serverOptions: ServerOptions = {
      port: this.config.websocketPort || 8099,
      host: 'localhost'
    }
    
    this.server.listen(serverOptions.port, serverOptions.host, () => {
      console.log(`Live reload server listening on ${serverOptions.host}:${serverOptions.port}`)
    })

    this.server.on('error', (error: Error) => {
      console.error('Server error:', error)
    })
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server || !this.wss) {
        resolve()
        return
      }

      this.connectedClients.forEach((client) => {
        client.terminate()
      })
      this.connectedClients.clear()

      this.wss.close(() => {
        this.server?.close(() => {
          this.wss = null
          this.server = null
          resolve()
        })
      })
    })
  }

  broadcastReload(): void {
    const message: LiveReloadMessage = { type: 'reload' }
    this.broadcast(message)
  }

  private handleMessage(ws: WebSocket, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString()) as LiveReloadMessage
      
      switch (message.type) {
        case 'ping':
          this.sendMessage(ws, { type: 'pong' })
          break
        default:
          // Ignore unknown message types
          break
      }
    } catch (error) {
      console.warn('Invalid WebSocket message received:', error)
    }
  }
  
  private sendMessage(ws: WebSocket, message: LiveReloadMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }
  
  private broadcast(message: LiveReloadMessage): void {
    this.connectedClients.forEach((client) => {
      this.sendMessage(client, message)
    })
  }
  
  
  getConnectedClientCount(): number {
    return this.connectedClients.size
  }
  
  isRunning(): boolean {
    return this.server !== null && this.wss !== null
  }
}