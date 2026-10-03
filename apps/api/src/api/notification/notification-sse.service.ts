import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { NotificationResDto } from './dto/notification.res.dto';

export type SseNotificationPayload =
  | {
      type: 'notification:new';
      targetAdminId: string;
      data: NotificationResDto;
    }
  | {
      type: 'notification:unread-count';
      targetAdminId: string;
      data: { unreadCount: number };
    };

@Injectable()
export class NotificationSseService {
  private readonly logger = new Logger(NotificationSseService.name);
  private readonly events$ = new Subject<SseNotificationPayload>();

  /**
   * Subscribe an admin to their personal notification event stream.
   * Maps matching events to SSE MessageEvent format.
   */
  subscribe(adminId: string): Observable<MessageEvent> {
    this.logger.debug(`Admin ${adminId} subscribed to notification SSE stream`);

    return this.events$.pipe(
      filter(
        (event) =>
          event.targetAdminId === adminId || event.targetAdminId === '*',
      ),
      map((event) => ({
        data: event.data,
        type: event.type,
      })),
    );
  }

  /**
   * Dispatch a newly created notification to a specific admin.
   */
  emitNewNotification(adminId: string, notification: NotificationResDto): void {
    this.events$.next({
      type: 'notification:new',
      targetAdminId: String(adminId),
      data: notification,
    });
  }

  /**
   * Dispatch updated unread count to a specific admin.
   */
  emitUnreadCount(adminId: string, unreadCount: number): void {
    this.events$.next({
      type: 'notification:unread-count',
      targetAdminId: String(adminId),
      data: { unreadCount },
    });
  }
}
