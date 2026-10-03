import { Logger, OnApplicationShutdown, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './events';
import { WsThrottleGuard } from './guards/ws-throttle.guard';
import { WsUserType } from './types';
import { WebsocketAuthService } from './websocket-auth.service';
import { WebsocketService } from './websocket.service';

export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Hardened, thin WebSocket Gateway for bidirectional realtime communication.
 *
 * Responsibilities:
 * - Connection authentication & principal binding
 * - Session revocation sweeps
 * - Direct user/admin room routing
 * - Rate limiting & graceful shutdown
 */
@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class WebsocketGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnApplicationShutdown
{
  private readonly logger = new Logger(WebsocketGateway.name);
  private authSweepTimer?: ReturnType<typeof setInterval>;

  @WebSocketServer()
  private readonly server: TypedServer;

  constructor(
    private readonly websocketAuthService: WebsocketAuthService,
    private readonly websocketService: WebsocketService,
  ) {}

  afterInit(server: TypedServer) {
    this.websocketService.bindServer(server);

    server.use((client, next) => {
      this.websocketAuthService
        .authenticate(client)
        .then((principal) => {
          client.data.principal = principal;
          next();
        })
        .catch((error) => {
          this.logger.warn(
            `Rejected socket connection ${client.id}: ${error.message}`,
          );
          next(new Error('Unauthorized'));
        });
    });

    this.authSweepTimer = setInterval(() => {
      void this.disconnectInactiveSockets(server);
    }, 30_000);
    this.authSweepTimer.unref?.();

    // Initial sweep to clear orphaned sockets from previous server restarts
    const initSweepTimeout = setTimeout(() => {
      void this.disconnectInactiveSockets(server);
    }, 3000);
    initSweepTimeout.unref?.();
  }

  async handleConnection(client: TypedSocket) {
    const principal = client.data.principal;
    if (!principal) return;

    // Join specific user or admin room for targeted messages
    if (principal.type === WsUserType.ADMIN) {
      client.join(this.websocketService.getAdminRoom(String(principal.id)));
    } else {
      client.join(this.websocketService.getUserRoom(String(principal.id)));
    }
  }

  async handleDisconnect(_client: TypedSocket) {
    // Rooms are automatically cleaned up by Socket.IO upon disconnect
  }

  @UseGuards(WsThrottleGuard)
  @SubscribeMessage('ws:ping')
  async ping(@ConnectedSocket() client: TypedSocket) {
    const isActive = await this.ensureSocketStillAuthorized(client);

    if (!isActive) {
      client.emit('ws:unauthorized', {
        message: 'Socket auth session is inactive',
      });
      return;
    }

    client.emit('ws:pong', { at: new Date().toISOString() });
  }

  @UseGuards(WsThrottleGuard)
  @SubscribeMessage('room:join')
  async handleRoomJoin(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() room: string,
  ) {
    if (!room || typeof room !== 'string') return;
    client.join(room);
    client.emit('room:joined', { room });
  }

  @UseGuards(WsThrottleGuard)
  @SubscribeMessage('room:leave')
  async handleRoomLeave(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() room: string,
  ) {
    if (!room || typeof room !== 'string') return;
    client.leave(room);
    client.emit('room:left', { room });
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Shutting down WebSocket gateway (${signal})...`);
    if (this.authSweepTimer) {
      clearInterval(this.authSweepTimer);
      this.authSweepTimer = undefined;
    }

    if (!this.server) return;

    const sockets = this.getNamespaceSockets(this.server);
    for (const socket of sockets.values()) {
      socket.emit('ws:shutdown', {
        message: 'Server is restarting for maintenance',
      });
      socket.disconnect(true);
    }
  }

  private async disconnectInactiveSockets(server: TypedServer) {
    const sockets = this.getNamespaceSockets(server);

    for (const client of sockets.values()) {
      await this.ensureSocketStillAuthorized(client);
    }
  }

  private async ensureSocketStillAuthorized(client: TypedSocket) {
    const principal = client.data.principal;

    if (!principal) {
      client.disconnect(true);
      return false;
    }

    try {
      await this.websocketAuthService.ensureSessionActive(principal);
      return true;
    } catch {
      this.logger.warn(
        `Revoking socket ${client.id} due to inactive auth session`,
      );
      client.emit('ws:unauthorized', {
        message: 'Socket auth session is inactive',
      });
      client.disconnect(true);
      return false;
    }
  }

  private getNamespaceSockets(server: TypedServer): Map<string, TypedSocket> {
    const namespaceOrServer = server as any;
    if (namespaceOrServer.sockets instanceof Map) {
      return namespaceOrServer.sockets;
    }

    if (
      namespaceOrServer.sockets &&
      namespaceOrServer.sockets.sockets instanceof Map
    ) {
      return namespaceOrServer.sockets.sockets;
    }

    return new Map<string, TypedSocket>();
  }
}
