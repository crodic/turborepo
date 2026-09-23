import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { PresenceService } from './presence.service';

/**
 * Unified Emitter Service for WebSocket events across the entire application.
 *
 * Provides typed helper methods to dispatch messages to:
 * - Specific administrators (`emitToAdmin`)
 * - Specific regular users (`emitToUser`)
 * - Specific rooms (`emitToRoom`), e.g., 'presence:admins', 'presence:users'
 * - Public streaming topics (`emitToPublicTopic`), e.g., 'market:btc', 'stream:live-banner'
 * - Broadcast across all connected clients in a namespace (`broadcast`, `broadcastPublic`)
 */
@Injectable()
export class WebsocketService {
  private readonly logger = new Logger(WebsocketService.name);
  private privateServer?: Server;
  private publicServer?: Server;

  constructor(private readonly presenceService: PresenceService) {}

  /**
   * Binds the private namespace (`/ws`) Socket.IO server.
   */
  bindServer(server: Server): void {
    this.privateServer = server;
    this.logger.log('Private Socket.IO server (/ws) bound to WebsocketService');
  }

  /**
   * Binds the public namespace (`/public`) Socket.IO server.
   */
  bindPublicServer(server: Server): void {
    this.publicServer = server;
    this.logger.log(
      'Public Socket.IO server (/public) bound to WebsocketService',
    );
  }

  /**
   * Returns the underlying private Socket.IO Server instance.
   */
  getServer(): Server | undefined {
    return this.privateServer;
  }

  /**
   * Returns the underlying public Socket.IO Server instance.
   */
  getPublicServer(): Server | undefined {
    return this.publicServer;
  }

  /**
   * Generates the standard room identifier for an admin.
   */
  getAdminRoom(adminId: string | number): string {
    return `admin:${adminId}`;
  }

  /**
   * Generates the standard room identifier for a regular user.
   */
  getUserRoom(userId: string | number): string {
    return `user:${userId}`;
  }

  /**
   * Emits an event to a specific admin across all connected devices/tabs.
   */
  emitToAdmin(adminId: string | number, event: string, payload: unknown): void {
    if (!this.privateServer) {
      this.logger.warn(
        `Cannot emit '${event}' to admin ${adminId}: Private server not bound`,
      );
      return;
    }
    this.privateServer.to(this.getAdminRoom(adminId)).emit(event, payload);
  }

  /**
   * Emits an event to a specific user across all connected devices/tabs.
   */
  emitToUser(userId: string | number, event: string, payload: unknown): void {
    if (!this.privateServer) {
      this.logger.warn(
        `Cannot emit '${event}' to user ${userId}: Private server not bound`,
      );
      return;
    }
    this.privateServer.to(this.getUserRoom(userId)).emit(event, payload);
  }

  /**
   * Emits an event to a specific private room (e.g., 'presence:admins').
   */
  emitToRoom(room: string, event: string, payload: unknown): void {
    if (!this.privateServer) {
      this.logger.warn(
        `Cannot emit '${event}' to room ${room}: Private server not bound`,
      );
      return;
    }
    this.privateServer.to(room).emit(event, payload);
  }

  /**
   * Broadcasts an event to ALL authenticated clients in the private namespace (`/ws`).
   */
  broadcast(event: string, payload: unknown): void {
    if (!this.privateServer) {
      this.logger.warn(`Cannot broadcast '${event}': Private server not bound`);
      return;
    }
    this.privateServer.emit(event, payload);
  }

  /**
   * Emits an event to a public subscribed topic in namespace (`/public`).
   * Example: `emitToPublicTopic('market:btc', 'price:update', { price: 95000 })`
   */
  emitToPublicTopic(topic: string, event: string, payload: unknown): void {
    if (!this.publicServer) {
      this.logger.warn(
        `Cannot emit '${event}' to public topic '${topic}': Public server not bound`,
      );
      return;
    }
    this.publicServer.to(topic).emit(event, payload);
  }

  /**
   * Broadcasts an event to ALL connected clients in the public namespace (`/public`).
   */
  broadcastPublic(event: string, payload: unknown): void {
    if (!this.publicServer) {
      this.logger.warn(
        `Cannot broadcast '${event}' to public: Public server not bound`,
      );
      return;
    }
    this.publicServer.emit(event, payload);
  }

  /**
   * Returns list of currently online administrator IDs from Redis Presence.
   */
  async getOnlineAdminIds(): Promise<number[]> {
    return this.presenceService.getOnlineAdminIds();
  }
}
