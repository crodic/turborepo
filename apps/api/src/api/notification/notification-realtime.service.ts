import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { NotificationResDto } from './dto/notification.res.dto';

@Injectable()
export class NotificationRealtimeService {
  private server?: Server;

  bindServer(server: Server) {
    this.server = server;
  }

  emitNewNotification(adminId: string, notification: NotificationResDto) {
    this.server
      ?.to(this.getAdminRoom(adminId))
      .emit('notification:new', notification);
  }

  emitUnreadCount(adminId: string, unreadCount: number) {
    this.server
      ?.to(this.getAdminRoom(adminId))
      .emit('notification:unread-count', { unreadCount });
  }

  getAdminRoom(adminId: string) {
    return `admin:${adminId}`;
  }

  getOnlineAdminIds(): number[] {
    if (!this.server) return [];

    const namespaceOrServer = this.server as any;
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
