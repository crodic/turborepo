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
import {
  NotificationAuthService,
  NotificationPrincipal,
} from './notification-auth.service';
import { NotificationRealtimeService } from './notification-realtime.service';
import { NotificationService } from './notification.service';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);
  private authSweepTimer?: ReturnType<typeof setInterval>;

  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly notificationAuthService: NotificationAuthService,
    private readonly notificationService: NotificationService,
    private readonly realtimeService: NotificationRealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtimeService.bindServer(server);
    server.use((client, next) => {
      this.notificationAuthService
        .authenticate(client)
        .then((principal) => {
          client.data.principal = principal;
          next();
        })
        .catch((error) => {
          this.logger.warn(
            `Rejected notification socket ${client.id}: ${error.message}`,
          );
          next(new Error('Unauthorized'));
        });
    });

    this.authSweepTimer = setInterval(() => {
      void this.disconnectInactiveSockets(server);
    }, 30000);
    this.authSweepTimer.unref?.();
  }

  async handleConnection(client: Socket) {
    const principal = client.data.principal as NotificationPrincipal;
    client.join(this.realtimeService.getAdminRoom(String(principal.id)));

    const unread = await this.notificationService.getUnreadCount(principal.id);
    client.emit('notification:unread-count', unread);
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('notification:ping')
  async ping(@ConnectedSocket() client: Socket) {
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

  private async disconnectInactiveSockets(server: Server) {
    const namespaceOrServer = server as any;
    const sockets: Map<string, Socket> =
      namespaceOrServer.sockets instanceof Map
        ? namespaceOrServer.sockets
        : namespaceOrServer.sockets.sockets;

    for (const client of sockets.values()) {
      await this.ensureSocketStillAuthorized(client);
    }
  }

  private async ensureSocketStillAuthorized(client: Socket) {
    const principal = client.data.principal as
      | NotificationPrincipal
      | undefined;

    if (!principal) {
      client.disconnect(true);
      return false;
    }

    try {
      await this.notificationAuthService.ensureSessionActive(principal);
      return true;
    } catch {
      client.emit('notification:unauthorized', {
        message: 'Notification auth session is inactive',
      });
      client.disconnect(true);
      return false;
    }
  }
}
