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
  }

  handleConnection(client: Socket) {
    const principal = client.data.principal as PresencePrincipal;

    client.join(
      principal.type === PresenceUserType.ADMIN
        ? PRESENCE_ADMIN_ROOM
        : PRESENCE_USER_ROOM,
    );

    const snapshot = this.presenceService.add(client.id, principal);

    client.emit('presence:me', this.toPublicPrincipal(principal));
    client.emit('presence:counts', snapshot.counts);

    if (principal.type === PresenceUserType.ADMIN) {
      client.emit('presence:snapshot', snapshot);
    }

    this.broadcastPresence();
  }

  handleDisconnect(client: Socket) {
    this.presenceService.remove(client.id);
    this.broadcastPresence();
  }

  @SubscribeMessage('presence:get')
  getPresence(@ConnectedSocket() client: Socket) {
    const principal = client.data.principal as PresencePrincipal;
    const snapshot = this.presenceService.touch(client.id);

    if (principal.type !== PresenceUserType.ADMIN) {
      return {
        event: 'presence:counts',
        data: snapshot.counts,
      };
    }

    return {
      event: 'presence:snapshot',
      data: snapshot,
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

    const snapshot = this.presenceService.touch(client.id);

    client.emit('presence:counts', snapshot.counts);

    return {
      event: 'presence:pong',
      data: { at: new Date().toISOString() },
    };
  }

  private broadcastPresence() {
    const snapshot = this.presenceService.getSnapshot();

    this.server.emit('presence:counts', snapshot.counts);
    this.server.emit('onlineCount', snapshot.counts.total);
    this.server.to(PRESENCE_ADMIN_ROOM).emit('presence:snapshot', snapshot);
  }

  private async disconnectInactiveSockets(server: Server) {
    const sockets = this.getNamespaceSockets(server);

    for (const client of sockets.values()) {
      await this.ensureSocketStillAuthorized(client);
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
    const { tokenHash, ...publicPrincipal } = principal;

    return publicPrincipal;
  }
}
