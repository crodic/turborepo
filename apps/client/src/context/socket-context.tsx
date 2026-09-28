"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Socket } from "socket.io-client";
import {
  getClientWs,
  type PresenceCounts,
  type PresencePrincipal,
  type WsClientState,
} from "@/lib/ws-client";

export type { PresenceCounts, PresencePrincipal };

export type SocketContextValue = {
  socket: Socket | null;
  me: PresencePrincipal | null;
  counts: PresenceCounts | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  me: null,
  counts: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WsClientState>(() => getClientWs().state);

  useEffect(() => {
    const wsClient = getClientWs();
    const unsubscribe = wsClient.subscribe(setState);

    void wsClient.connect();

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <SocketContext.Provider value={state}>{children}</SocketContext.Provider>
  );
}

/**
 * Hook to access the WebSocket client, connection state, current user info, and presence counts.
 */
export function useSocket() {
  return useContext(SocketContext);
}

// Backward-compatibility aliases for legacy code
export const PresenceSocketProvider = SocketProvider;
export const usePresenceSocket = useSocket;
