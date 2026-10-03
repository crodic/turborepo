import { Injectable } from '@nestjs/common';
import { NotificationResDto } from './dto/notification.res.dto';
import { NotificationSseService } from './notification-sse.service';

/**
 * Realtime dispatch service for notifications.
 * Uses SSE (Server-Sent Events) instead of persistent WebSocket connections.
 */
@Injectable()
export class NotificationRealtimeService {
  constructor(private readonly sseService: NotificationSseService) {}

  /**
   * Dispatch a newly created notification to the target admin via SSE.
   */
  emitNewNotification(adminId: string, notification: NotificationResDto): void {
    this.sseService.emitNewNotification(adminId, notification);
  }

  /**
   * Dispatch updated unread notification count to the target admin via SSE.
   */
  emitUnreadCount(adminId: string, unreadCount: number): void {
    this.sseService.emitUnreadCount(adminId, unreadCount);
  }
}
