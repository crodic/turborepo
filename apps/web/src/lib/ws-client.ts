import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth-store'
import { refreshAdminToken } from '@/lib/http'

export type WsUserType = 'admin' | 'user' | 'guest'

export interface WsClientOptions {
  /**
   * Target WebSocket URL including namespace (e.g., 'http://localhost:8000/ws' or '/public')
   */
  url: string
  /**
   * User role type: 'admin', 'user', or 'guest' (for unauthenticated public streams)
   */
  userType?: WsUserType
  /**
   * Token getter for authenticated connections. Omit or return null for public connections.
   */
  getToken?: () =>
    | string
    | null
    | undefined
    | Promise<string | null | undefined>
  /**
   * Token refresher invoked when server rejects authentication with Unauthorized.
   */
  refreshToken?: () => Promise<string | null | undefined>
  /**
   * Ping interval in milliseconds (default: 25000ms).
   */
  pingIntervalMs?: number
  /**
   * Heartbeat event name to emit periodically (default: 'presence:ping').
   */
  pingEvent?: string
  /**
   * Whether this client connects to a public unauthenticated namespace.
   */
  isPublic?: boolean
}

export type WsConnectionStatus = 'disconnected' | 'connecting' | 'connected'

/**
 * Robust WebSocket Client wrapper around Socket.IO Client.
 *
 * Responsibilities:
 * - Transport lifecycle management (connect, disconnect, auto-reconnect)
 * - Automatic token refresh on authentication failures without page reloads
 * - Background ping heartbeat and document visibility awareness
 * - Topic subscription support for public streams
 */
export class WsClient {
  private socket: Socket | null = null
  private pingTimer?: ReturnType<typeof setInterval>
  private isRefreshing = false
  private status: WsConnectionStatus = 'disconnected'
  private statusListeners = new Set<
    (status: WsConnectionStatus, socket: Socket | null) => void
  >()
  private visibilityHandler?: () => void

  constructor(private readonly options: WsClientOptions) {}

  get statusState(): WsConnectionStatus {
    return this.status
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  get rawSocket(): Socket | null {
    return this.socket
  }

  onStatusChange(
    listener: (status: WsConnectionStatus, socket: Socket | null) => void
  ): () => void {
    this.statusListeners.add(listener)
    listener(this.status, this.socket)
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  private setStatus(newStatus: WsConnectionStatus) {
    this.status = newStatus
    for (const listener of this.statusListeners) {
      try {
        listener(newStatus, this.socket)
      } catch {
        // Ignore subscriber errors
      }
    }
  }

  async connect(): Promise<Socket | null> {
    if (this.socket?.connected) {
      return this.socket
    }

    const isPublic = this.options.isPublic || this.options.userType === 'guest'
    let token: string | null | undefined = null

    if (!isPublic && this.options.getToken) {
      token = await this.options.getToken()
      if (!token) {
        this.disconnect()
        return null
      }
    }

    if (this.socket) {
      this.disconnect()
    }

    this.setStatus('connecting')

    const newSocket = io(this.options.url, {
      auth: isPublic
        ? undefined
        : {
            token,
            userType: this.options.userType ?? 'admin',
          },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    this.socket = newSocket
    this.bindSocketEvents(newSocket)
    this.startHeartbeat()

    return newSocket
  }

  private bindSocketEvents(socket: Socket) {
    socket.on('connect', () => {
      if (this.socket !== socket) return
      this.setStatus('connected')
    })

    socket.on('disconnect', () => {
      if (this.socket !== socket) return
      this.setStatus('disconnected')
    })

    socket.on('connect_error', async (error) => {
      if (this.socket !== socket) return

      const message = error.message ?? ''
      const isUnauthorized =
        message.includes('Unauthorized') || message.includes('unauthorized')

      if (isUnauthorized && this.options.refreshToken) {
        await this.handleTokenExpired()
      }
    })

    socket.on('presence:unauthorized', async () => {
      if (this.socket !== socket) return
      if (this.options.refreshToken) {
        await this.handleTokenExpired()
      }
    })

    socket.on('notification:unauthorized', async () => {
      if (this.socket !== socket) return
      if (this.options.refreshToken) {
        await this.handleTokenExpired()
      }
    })
  }

  private async handleTokenExpired() {
    if (this.isRefreshing) return
    this.isRefreshing = true

    try {
      const newToken = await this.options.refreshToken?.()
      if (newToken && this.socket) {
        this.socket.auth = {
          token: newToken,
          userType: this.options.userType ?? 'admin',
        }
        this.socket.connect()
      } else {
        this.disconnect()
      }
    } catch {
      this.disconnect()
    } finally {
      this.isRefreshing = false
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat()

    const pingEvent = this.options.pingEvent ?? 'presence:ping'
    const intervalMs = this.options.pingIntervalMs ?? 25000

    this.pingTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit(pingEvent)
      }
    }, intervalMs)

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible' && this.socket?.connected) {
        this.socket.emit(pingEvent)
      }
    }

    document.addEventListener('visibilitychange', this.visibilityHandler)
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = undefined
    }

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = undefined
    }
  }

  disconnect() {
    this.stopHeartbeat()

    if (this.socket) {
      const sock = this.socket
      this.socket = null
      sock.disconnect()
    }

    this.setStatus('disconnected')
  }

  /**
   * Subscribes to a public topic (only relevant for /public namespace).
   */
  subscribeTopic(topic: string) {
    this.socket?.emit('public:subscribe', { topic })
  }

  /**
   * Unsubscribes from a public topic.
   */
  unsubscribeTopic(topic: string) {
    this.socket?.emit('public:unsubscribe', { topic })
  }

  emit(event: string, ...args: unknown[]) {
    this.socket?.emit(event, ...args)
  }

  on(event: string, listener: (...args: unknown[]) => void) {
    this.socket?.on(event, listener)
  }

  off(event: string, listener?: (...args: unknown[]) => void) {
    if (listener) {
      this.socket?.off(event, listener)
    } else {
      this.socket?.off(event)
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton Instances
// ---------------------------------------------------------------------------

let wsClientInstance: WsClient | null = null
let publicWsClientInstance: WsClient | null = null

function resolveSocketBaseUrl(): string {
  const envUrl =
    (import.meta.env.VITE_SOCKET_URL as string | undefined) ||
    (import.meta.env.VITE_API_URL as string | undefined)?.replace(
      /\/api(\/.*)?$/,
      ''
    )

  if (envUrl) {
    return envUrl.replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined' && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8000`
  }

  return 'http://localhost:8000'
}

/**
 * Returns the authenticated Admin WebSocket Client singleton (namespace: /ws).
 */
export function getWsClient(): WsClient {
  if (!wsClientInstance) {
    const socketUrl = resolveSocketBaseUrl()
    wsClientInstance = new WsClient({
      url: `${socketUrl}/ws`,
      userType: 'admin',
      getToken: () => useAuthStore.getState().meta.accessToken,
      refreshToken: refreshAdminToken,
      pingIntervalMs: 25000,
      pingEvent: 'presence:ping',
    })
  }

  return wsClientInstance
}

/**
 * Returns the unauthenticated Public WebSocket Client singleton (namespace: /public).
 */
export function getPublicWsClient(): WsClient {
  if (!publicWsClientInstance) {
    const socketUrl = resolveSocketBaseUrl()
    publicWsClientInstance = new WsClient({
      url: `${socketUrl}/public`,
      userType: 'guest',
      isPublic: true,
      pingIntervalMs: 30000,
      pingEvent: 'public:ping',
    })
  }

  return publicWsClientInstance
}
