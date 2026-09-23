import { io, type Socket } from "socket.io-client";

export type PresenceCounts = {
  admins: number;
  users: number;
  total: number;
};

export type PresencePrincipal = {
  id: string | number;
  type: "user";
  sessionId?: string | number;
  email: string;
  fullName?: string;
  avatar?: string;
};

export type WsClientState = {
  socket: Socket | null;
  me: PresencePrincipal | null;
  counts: PresenceCounts | null;
  isConnected: boolean;
};

export interface WsClientOptions {
  /**
   * Base server URL without namespace
   */
  url?: string;
  /**
   * Target namespace (default: '/ws' for authenticated, or '/public' for guest)
   */
  namespace?: string;
  /**
   * Whether this connection is public (skips auth cookies & tokens)
   */
  isPublic?: boolean;
  /**
   * Ping interval in milliseconds (default: 25000ms)
   */
  pingIntervalMs?: number;
}

/**
 * Next.js Client WebSocket class.
 *
 * Responsibilities:
 * - Transport lifecycle management
 * - Cookie & server token synchronization via Next.js route handlers
 * - Presence state subscription (Observer Pattern)
 * - Topic subscription for public streams
 */
export class WsClient {
  private socket: Socket | null = null;
  private me: PresencePrincipal | null = null;
  private counts: PresenceCounts | null = null;
  private isConnected = false;
  private isRefreshing = false;
  private pingTimer?: ReturnType<typeof setInterval>;
  private visibilityHandler?: () => void;
  private tokensUpdatedHandler?: () => void;
  private listeners = new Set<(state: WsClientState) => void>();
  private readonly url: string;
  private readonly namespace: string;
  private readonly isPublic: boolean;
  private readonly pingIntervalMs: number;

  constructor(options?: WsClientOptions) {
    const rawUrl =
      options?.url ||
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api(\/.*)?$/, "") ||
      (typeof window !== "undefined" && window.location.hostname
        ? `${window.location.protocol}//${window.location.hostname}:8000`
        : "http://localhost:8000");

    this.url = rawUrl.replace(/\/+$/, "");
    this.isPublic = options?.isPublic ?? false;
    this.namespace = options?.namespace ?? (this.isPublic ? "/public" : "/ws");
    this.pingIntervalMs = options?.pingIntervalMs ?? 25000;
  }

  get state(): WsClientState {
    return {
      socket: this.socket,
      me: this.me,
      counts: this.counts,
      isConnected: this.isConnected,
    };
  }

  get rawSocket(): Socket | null {
    return this.socket;
  }

  subscribe(listener: (state: WsClientState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.state;
    for (const listener of this.listeners) {
      try {
        listener(currentState);
      } catch {
        // ignore subscriber errors
      }
    }
  }

  async getAccessToken(options?: { allowRefresh?: boolean }): Promise<string> {
    if (this.isPublic) {
      return "";
    }

    let { accessToken } = await this.fetchTokens();
    if (!accessToken && options?.allowRefresh !== false) {
      accessToken = await this.refreshTokens();
    }
    return accessToken || "";
  }

  private async fetchTokens(): Promise<{
    accessToken?: string;
    refreshToken?: string;
  }> {
    try {
      const response = await fetch("/api/auth/tokens", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        return { accessToken: "", refreshToken: "" };
      }
      return (await response.json()) as {
        accessToken?: string;
        refreshToken?: string;
      };
    } catch {
      return { accessToken: "", refreshToken: "" };
    }
  }

  private async refreshTokens(): Promise<string> {
    const { refreshToken } = await this.fetchTokens();
    if (!refreshToken) {
      return "";
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/auth/refresh`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        }
      );

      if (!response.ok) {
        return "";
      }

      const tokens = (await response.json()) as {
        accessToken?: string;
        refreshToken?: string;
      };

      if (!tokens.accessToken || !tokens.refreshToken) {
        return "";
      }

      await fetch("/api/auth/tokens", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tokens),
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:tokens-updated"));
      }

      return tokens.accessToken;
    } catch {
      return "";
    }
  }

  async connect(options?: { allowRefresh?: boolean }): Promise<Socket | null> {
    if (!this.url || (this.socket?.connected && !options)) {
      return this.socket;
    }

    let accessToken = "";
    if (!this.isPublic) {
      accessToken = await this.getAccessToken(options);
      if (!accessToken) {
        this.disconnect();
        return null;
      }
    }

    if (this.socket) {
      this.cleanupSocket();
    }

    const nextSocket = io(`${this.url}${this.namespace}`, {
      auth: this.isPublic
        ? undefined
        : {
            token: accessToken,
            userType: "user",
          },
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket = nextSocket;
    this.bindSocketEvents(nextSocket);
    this.startHeartbeat();
    this.bindDomEvents();

    this.notify();
    return nextSocket;
  }

  private bindSocketEvents(nextSocket: Socket) {
    nextSocket.on("connect", () => {
      if (this.socket !== nextSocket) return;
      this.isConnected = true;
      if (!this.isPublic) {
        nextSocket.emit("presence:get");
      }
      this.notify();
    });

    nextSocket.on("disconnect", () => {
      if (this.socket !== nextSocket) return;
      this.isConnected = false;
      this.notify();
    });

    if (!this.isPublic) {
      nextSocket.on("connect_error", async () => {
        if (this.socket !== nextSocket) return;
        await this.handleTokenExpired();
      });

      nextSocket.on("presence:unauthorized", async () => {
        if (this.socket !== nextSocket) return;
        await this.handleTokenExpired();
      });

      nextSocket.on("presence:me", (principal: PresencePrincipal) => {
        if (this.socket !== nextSocket) return;
        this.me = principal;
        this.notify();
      });

      nextSocket.on("presence:counts", (nextCounts: PresenceCounts) => {
        if (this.socket !== nextSocket) return;
        this.counts = nextCounts;
        this.notify();
      });
    }
  }

  private async handleTokenExpired() {
    if (this.isRefreshing || this.isPublic) return;
    this.isRefreshing = true;

    try {
      this.cleanupSocket();
      const newAccessToken = await this.refreshTokens();
      if (!newAccessToken) {
        this.disconnect();
        return;
      }
      await this.connect({ allowRefresh: false });
    } finally {
      this.isRefreshing = false;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    const pingEvent = this.isPublic ? "public:ping" : "presence:ping";

    this.pingTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit(pingEvent);
      }
    }, this.pingIntervalMs);
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = undefined;
    }
  }

  private bindDomEvents() {
    if (typeof window === "undefined" || this.tokensUpdatedHandler) return;

    if (!this.isPublic) {
      this.tokensUpdatedHandler = () => {
        this.disconnect();
        void this.connect();
      };
      window.addEventListener("auth:tokens-updated", this.tokensUpdatedHandler);
    }

    const pingEvent = this.isPublic ? "public:ping" : "presence:ping";
    this.visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        if (!this.socket?.connected) {
          void this.connect();
        } else {
          this.socket.emit(pingEvent);
        }
      }
    };

    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  private cleanupSocket() {
    if (this.socket) {
      const sock = this.socket;
      this.socket = null;
      sock.disconnect();
    }
    this.isConnected = false;
  }

  disconnect() {
    this.stopHeartbeat();

    if (typeof window !== "undefined") {
      if (this.tokensUpdatedHandler) {
        window.removeEventListener(
          "auth:tokens-updated",
          this.tokensUpdatedHandler
        );
        this.tokensUpdatedHandler = undefined;
      }
      if (this.visibilityHandler) {
        document.removeEventListener(
          "visibilitychange",
          this.visibilityHandler
        );
        this.visibilityHandler = undefined;
      }
    }

    this.cleanupSocket();
    this.me = null;
    this.counts = null;
    this.notify();
  }

  /**
   * Subscribes to a public topic (only relevant for /public namespace).
   */
  subscribeTopic(topic: string) {
    this.socket?.emit("public:subscribe", { topic });
  }

  /**
   * Unsubscribes from a public topic.
   */
  unsubscribeTopic(topic: string) {
    this.socket?.emit("public:unsubscribe", { topic });
  }

  emit(event: string, ...args: unknown[]) {
    this.socket?.emit(event, ...args);
  }

  on(event: string, listener: (...args: unknown[]) => void) {
    this.socket?.on(event, listener);
  }

  off(event: string, listener?: (...args: unknown[]) => void) {
    if (listener) {
      this.socket?.off(event, listener);
    } else {
      this.socket?.off(event);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton Instances
// ---------------------------------------------------------------------------

let clientInstance: WsClient | null = null;
let publicClientInstance: WsClient | null = null;

/**
 * Returns the authenticated User WebSocket Client singleton (namespace: /ws).
 */
export function getClientWs(): WsClient {
  if (!clientInstance) {
    clientInstance = new WsClient({ isPublic: false, namespace: "/ws" });
  }
  return clientInstance;
}

/**
 * Returns the unauthenticated Public WebSocket Client singleton (namespace: /public).
 */
export function getPublicClientWs(): WsClient {
  if (!publicClientInstance) {
    publicClientInstance = new WsClient({
      isPublic: true,
      namespace: "/public",
    });
  }
  return publicClientInstance;
}
