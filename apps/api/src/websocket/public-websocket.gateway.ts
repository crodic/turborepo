import { Logger } from '@nestjs/common';
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
import { WebsocketService } from './websocket.service';

/**
 * Public WebSocket Gateway mounted at namespace `/public`.
 *
 * Designed for unauthenticated / guest streaming data such as:
 * - Live market prices, stock tickers, or cryptocurrency rates
 * - Public live stream viewer counts
 * - General system banners and public announcements
 *
 * Uses the Topic Subscription pattern: clients connect anonymously
 * and subscribe to specific topics (rooms) they are interested in.
 */
@WebSocketGateway({
  namespace: '/public',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class PublicWebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(PublicWebsocketGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  constructor(private readonly websocketService: WebsocketService) {}

  afterInit(server: Server) {
    this.websocketService.bindPublicServer(server);
    this.logger.log(
      'Public WebSocket Gateway initialized on namespace /public',
    );
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Public client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Public client disconnected: ${client.id}`);
  }

  /**
   * Subscribe to a public topic (e.g., 'market:btc', 'stream:live-banner')
   */
  @SubscribeMessage('public:subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { topic?: string },
  ) {
    const topic = payload?.topic?.trim();
    if (!topic || topic.length > 100) {
      return {
        event: 'public:error',
        data: {
          message: 'Invalid topic: must be between 1 and 100 characters',
        },
      };
    }

    client.join(topic);
    return {
      event: 'public:subscribed',
      data: { topic },
    };
  }

  /**
   * Unsubscribe from a public topic
   */
  @SubscribeMessage('public:unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { topic?: string },
  ) {
    const topic = payload?.topic?.trim();
    if (topic) {
      client.leave(topic);
    }

    return {
      event: 'public:unsubscribed',
      data: { topic },
    };
  }

  /**
   * Lightweight ping-pong heartbeat for public connections
   */
  @SubscribeMessage('public:ping')
  handlePing() {
    return {
      event: 'public:pong',
      data: { at: new Date().toISOString() },
    };
  }
}
