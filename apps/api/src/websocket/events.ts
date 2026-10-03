import { WsPrincipal } from './types';

/**
 * Server-to-Client typed event map.
 */
export interface ServerToClientEvents {
  'ws:pong': (data: { at: string }) => void;
  'ws:unauthorized': (data: { message: string }) => void;
  'ws:error': (data: { code: string; message: string }) => void;
  'ws:shutdown': (data: { message: string }) => void;
  'room:joined': (data: { room: string }) => void;
  'room:left': (data: { room: string }) => void;
}

/**
 * Client-to-Server typed event map.
 */
export interface ClientToServerEvents {
  'ws:ping': () => void;
  'room:join': (room: string) => void;
  'room:leave': (room: string) => void;
}

/**
 * Inter-server communication events for clustered Socket.IO instances.
 */
export interface InterServerEvents {
  ping: () => void;
}

/**
 * Socket data attached to client.data during connection lifecycle.
 */
export interface SocketData {
  principal: WsPrincipal;
  rateLimit?: {
    count: number;
    resetAt: number;
  };
}
