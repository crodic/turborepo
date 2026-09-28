import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PresenceService } from './presence.service';
import { OnlinePresence, WsPrincipal, WsUserType } from './types';
import { WebsocketAuthService } from './websocket-auth.service';
import { WebsocketService } from './websocket.service';

const PRESENCE_ADMIN_ROOM = 'presence:admins';
const PRESENCE_USER_ROOM = 'presence:users';

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebsocketGateway.name);
  private authSweepTimer?: ReturnType<typeof setInterval>;

  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly websocketAuthService: WebsocketAuthService,
    private readonly websocketService: WebsocketService,
    private readonly presenceService: PresenceService,
  ) {}

  afterInit(server: Server) {
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
    }, 30000);
    this.authSweepTimer.unref?.();

    // Initial sweep to clear orphaned sockets from previous server restarts
    const initSweepTimeout = setTimeout(() => {
      void this.disconnectInactiveSockets(server);
    }, 3000);
    initSweepTimeout.unref?.();
  }

  async handleConnection(client: Socket) {
    const principal = client.data.principal as WsPrincipal;

    // Join role and specific user/admin rooms
    if (principal.type === WsUserType.ADMIN) {
      client.join(PRESENCE_ADMIN_ROOM);
      client.join(this.websocketService.getAdminRoom(String(principal.id)));
    } else {
      client.join(PRESENCE_USER_ROOM);
      client.join(this.websocketService.getUserRoom(String(principal.id)));
    }

    const snapshot = await this.presenceService.add(client.id, principal);

    client.emit('presence:me', this.toPublicPrincipal(principal));
    client.emit('presence:counts', snapshot.counts);

    if (principal.type === WsUserType.ADMIN) {
      client.emit('presence:snapshot', snapshot);
    }

    await this.broadcastPresence();
  }

  async handleDisconnect(client: Socket) {
    await this.presenceService.remove(client.id);
    await this.broadcastPresence();
  }

  @SubscribeMessage('presence:subscribe')
  async handleSubscribe(@ConnectedSocket() client: Socket) {
    const principal = client.data.principal as WsPrincipal | undefined;
    const snapshot = await this.presenceService.touch(client.id, principal);

    client.emit('presence:counts', snapshot.counts);

    if (principal?.type === WsUserType.ADMIN) {
      client.emit('presence:snapshot', snapshot);
    }
  }

  @SubscribeMessage('presence:unsubscribe')
  async handleUnsubscribe(@ConnectedSocket() _client: Socket) {
    // Client unsubscribed from presence updates
  }

  @SubscribeMessage('presence:get')
  async getPresence(@ConnectedSocket() client: Socket) {
    const principal = client.data.principal as WsPrincipal | undefined;
    const snapshot = await this.presenceService.touch(client.id, principal);

    client.emit('presence:counts', snapshot.counts);

    if (principal?.type === WsUserType.ADMIN) {
      client.emit('presence:snapshot', snapshot);
    }

    return {
      event:
        principal?.type === WsUserType.ADMIN
          ? 'presence:snapshot'
          : 'presence:counts',
      data: principal?.type === WsUserType.ADMIN ? snapshot : snapshot.counts,
    };
  }

  @SubscribeMessage('presence:ping')
  async ping(@ConnectedSocket() client: Socket) {
    const isActive = await this.ensureSocketStillAuthorized(client);

    if (!isActive) {
      return {
        event: 'presence:unauthorized',
        data: { message: 'Socket auth session is inactive' },
      };
    }

    const principal = client.data.principal as WsPrincipal | undefined;
    const snapshot = await this.presenceService.touch(client.id, principal);

    client.emit('presence:counts', snapshot.counts);

    return {
      event: 'presence:pong',
      data: { at: new Date().toISOString() },
    };
  }

  @SubscribeMessage('notification:ping')
  async notificationPing(@ConnectedSocket() client: Socket) {
    const isActive = await this.ensureSocketStillAuthorized(client);

    if (!isActive) {
      return {
        event: 'notification:unauthorized',
        data: { message: 'Notification auth session is inactive' },
      };
    }

    return {
      event: 'notification:pong',
      data: { at: new Date().toISOString() },
    };
  }

  private async broadcastPresence() {
    const snapshot = await this.presenceService.getSnapshot();

    this.server.emit('presence:counts', snapshot.counts);
    this.server.emit('onlineCount', snapshot.counts.total);
    this.server.to(PRESENCE_ADMIN_ROOM).emit('presence:snapshot', snapshot);
  }

  private async disconnectInactiveSockets(server: Server) {
    const sockets = this.getNamespaceSockets(server);

    for (const client of sockets.values()) {
      await this.ensureSocketStillAuthorized(client);
    }

    const hasPruned = await this.presenceService.pruneDeadSockets();
    if (hasPruned) {
      await this.broadcastPresence();
    }
  }

  private async ensureSocketStillAuthorized(client: Socket) {
    const principal = client.data.principal as WsPrincipal | undefined;

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
      client.emit('presence:unauthorized', {
        message: 'Socket auth session is inactive',
      });
      client.disconnect(true);
      return false;
    }
  }

  private toPublicPrincipal(
    principal: WsPrincipal,
  ): Omit<OnlinePresence, 'socketCount'> {
    const now = new Date();
    return {
      id: principal.id,
      type: principal.type,
      sessionId: principal.sessionId,
      email: principal.email,
      fullName: principal.fullName,
      avatar: principal.avatar,
      connectedAt: now,
      lastSeenAt: now,
    };
  }

  private getNamespaceSockets(server: Server): Map<string, Socket> {
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

    return new Map<string, Socket>();
  }
}
