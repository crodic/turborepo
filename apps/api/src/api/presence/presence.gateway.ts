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
import { PresenceAuthService } from './presence-auth.service';
import { PresenceService } from './presence.service';
import { PresencePrincipal, PresenceUserType } from './types';

const PRESENCE_ADMIN_ROOM = 'presence:admins';
const PRESENCE_USER_ROOM = 'presence:users';

@WebSocketGateway({
  namespace: '/presence',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class PresenceGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(PresenceGateway.name);
  private authSweepTimer?: ReturnType<typeof setInterval>;

  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly presenceAuthService: PresenceAuthService,
    private readonly presenceService: PresenceService,
  ) {}

  afterInit(server: Server) {
    server.use((client, next) => {
      this.presenceAuthService
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
    const principal = client.data.principal as PresencePrincipal;

    client.join(
      principal.type === PresenceUserType.ADMIN
        ? PRESENCE_ADMIN_ROOM
        : PRESENCE_USER_ROOM,
    );

    const snapshot = await this.presenceService.add(client.id, principal);

    client.emit('presence:me', this.toPublicPrincipal(principal));
    client.emit('presence:counts', snapshot.counts);

    if (principal.type === PresenceUserType.ADMIN) {
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
    const principal = client.data.principal as PresencePrincipal | undefined;
    const snapshot = await this.presenceService.touch(client.id, principal);

    client.emit('presence:counts', snapshot.counts);

    if (principal?.type === PresenceUserType.ADMIN) {
      client.emit('presence:snapshot', snapshot);
    }
  }

  @SubscribeMessage('presence:unsubscribe')
  async handleUnsubscribe(@ConnectedSocket() _client: Socket) {
    // Client unsubscribed from presence updates for specific page
  }

  @SubscribeMessage('presence:get')
  async getPresence(@ConnectedSocket() client: Socket) {
    const principal = client.data.principal as PresencePrincipal | undefined;
    const snapshot = await this.presenceService.touch(client.id, principal);

    client.emit('presence:counts', snapshot.counts);

    if (principal?.type === PresenceUserType.ADMIN) {
      client.emit('presence:snapshot', snapshot);
    }

    return {
      event:
        principal?.type === PresenceUserType.ADMIN
          ? 'presence:snapshot'
          : 'presence:counts',
      data:
        principal?.type === PresenceUserType.ADMIN ? snapshot : snapshot.counts,
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

    const principal = client.data.principal as PresencePrincipal | undefined;
    const snapshot = await this.presenceService.touch(client.id, principal);

    client.emit('presence:counts', snapshot.counts);

    return {
      event: 'presence:pong',
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

    const liveSocketIds = new Set(sockets.keys());
    const hasPruned =
      await this.presenceService.pruneDeadSockets(liveSocketIds);
    if (hasPruned) {
      await this.broadcastPresence();
    }
  }

  private async ensureSocketStillAuthorized(client: Socket) {
    const principal = client.data.principal as PresencePrincipal | undefined;

    if (!principal) {
      client.disconnect(true);
      return false;
    }

    try {
      await this.presenceAuthService.ensureSessionActive(principal);
      return true;
    } catch {
      client.emit('presence:unauthorized', {
        message: 'Socket auth session is inactive',
      });
      client.disconnect(true);
      return false;
    }
  }

  private getNamespaceSockets(server: Server): Map<string, Socket> {
    const namespaceOrServer = server as any;

    return namespaceOrServer.sockets instanceof Map
      ? namespaceOrServer.sockets
      : namespaceOrServer.sockets.sockets;
  }

  private toPublicPrincipal(principal: PresencePrincipal) {
    const { tokenHash: _tokenHash, ...publicPrincipal } = principal;

    return publicPrincipal;
  }
}
