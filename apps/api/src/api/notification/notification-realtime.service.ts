import { WebsocketService } from '@/websocket/websocket.service';
import { Injectable } from '@nestjs/common';
import { NotificationResDto } from './dto/notification.res.dto';

@Injectable()
export class NotificationRealtimeService {
  constructor(private readonly websocketService: WebsocketService) {}

  emitNewNotification(adminId: string, notification: NotificationResDto) {
    this.websocketService.emitToAdmin(
      adminId,
      'notification:new',
      notification,
    );
  }

  emitUnreadCount(adminId: string, unreadCount: number) {
    this.websocketService.emitToAdmin(adminId, 'notification:unread-count', {
      unreadCount,
    });
  }

  getAdminRoom(adminId: string) {
    return this.websocketService.getAdminRoom(adminId);
  }

  getOnlineAdminIds(): number[] {
    const server = this.websocketService.getServer();
    if (!server) return [];

    const namespaceOrServer = server as any;
    const adapter =
      namespaceOrServer.adapter || namespaceOrServer.sockets?.adapter;
    if (!adapter || !adapter.rooms) return [];

    const rooms = adapter.rooms;
    const onlineIds: number[] = [];

    for (const [roomName, sockets] of rooms.entries()) {
      if (roomName.startsWith('admin:') && sockets.size > 0) {
        const id = parseInt(roomName.replace('admin:', ''), 10);
        if (!isNaN(id)) {
          onlineIds.push(id);
        }
      }
    }
    return onlineIds;
  }
}
