"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";

type PresenceCounts = {
  admins: number;
  users: number;
  total: number;
};

type PresencePrincipal = {
  id: string | number;
  type: "user";
  sessionId?: string | number;
  email: string;
  fullName?: string;
  avatar?: string;
  impersonatedBy?: string | number;
};

type PresenceSocketContextValue = {
  socket: Socket | null;
  me: PresencePrincipal | null;
  counts: PresenceCounts | null;
  isConnected: boolean;
};

const PresenceSocketContext = createContext<PresenceSocketContextValue>({
  socket: null,
  me: null,
  counts: null,
  isConnected: false,
});

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? process.env.NEXT_PUBLIC_API_URL;

async function getTokens() {
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
}

async function refreshTokens() {
  const { refreshToken } = await getTokens();

  if (!refreshToken) {
    return "";
  }

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

  return tokens.accessToken;
}

export function PresenceSocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const reconnectingRef = useRef(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [me, setMe] = useState<PresencePrincipal | null>(null);
  const [counts, setCounts] = useState<PresenceCounts | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const pingTimer = setInterval(() => {
      socketRef.current?.emit("presence:ping");
    }, 25000);

    const disconnect = () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      queueMicrotask(() => {
        if (!isMounted) return;
        setSocket(null);
        setMe(null);
        setCounts(null);
        setIsConnected(false);
      });
    };

    const connect = async (options?: { allowRefresh?: boolean }) => {
      if (!SOCKET_URL || socketRef.current?.connected) {
        return;
      }

      let { accessToken } = await getTokens();

      if (!accessToken && options?.allowRefresh !== false) {
        accessToken = await refreshTokens();
      }

      if (!accessToken || !isMounted) {
        disconnect();
        return;
      }

      socketRef.current?.disconnect();

      const nextSocket = io(`${SOCKET_URL}/presence`, {
        auth: {
          token: accessToken,
          userType: "user",
        },
        transports: ["websocket", "polling"],
      });

      socketRef.current = nextSocket;

      nextSocket.on("connect", () => {
        if (!isMounted) return;
        setIsConnected(true);
        nextSocket.emit("presence:get");
      });

      nextSocket.on("disconnect", () => {
        if (!isMounted) return;
        setIsConnected(false);
      });

      nextSocket.on("connect_error", async () => {
        if (reconnectingRef.current) {
          return;
        }

        reconnectingRef.current = true;
        nextSocket.disconnect();
        const newAccessToken = await refreshTokens();
        reconnectingRef.current = false;

        if (!newAccessToken || !isMounted) {
          disconnect();
          return;
        }

        void connect({ allowRefresh: false });
      });

      nextSocket.on("presence:unauthorized", async () => {
        nextSocket.disconnect();
        const newAccessToken = await refreshTokens();

        if (!newAccessToken || !isMounted) {
          disconnect();
          return;
        }

        void connect({ allowRefresh: false });
      });

      nextSocket.on("presence:me", (principal: PresencePrincipal) => {
        setMe(principal);
      });

      nextSocket.on("presence:counts", (nextCounts: PresenceCounts) => {
        setCounts(nextCounts);
      });

      queueMicrotask(() => {
        if (isMounted) {
          setSocket(nextSocket);
        }
      });
    };

    const handleTokensUpdated = () => {
      disconnect();
      void connect();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void connect();
      }
    };

    void connect();
    window.addEventListener("auth:tokens-updated", handleTokensUpdated);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener("auth:tokens-updated", handleTokensUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(pingTimer);
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <PresenceSocketContext.Provider
      value={{
        socket,
        me,
        counts,
        isConnected,
      }}
    >
      {children}
    </PresenceSocketContext.Provider>
  );
}

export function usePresenceSocket() {
  return useContext(PresenceSocketContext);
}
