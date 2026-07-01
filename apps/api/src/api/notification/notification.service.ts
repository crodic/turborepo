import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { IsNull, LessThan, Repository } from 'typeorm';
import { NotificationResDto } from './dto/notification.res.dto';
import { NotificationUnreadCountResDto } from './dto/unread-count.res.dto';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationRealtimeService } from './notification-realtime.service';

export enum AdminNotificationType {
  NewSession = 'admin.login.new_session',
  TwoFactorEnabled = 'admin.security.2fa_enabled',
  TwoFactorDisabled = 'admin.security.2fa_disabled',
  PasswordChanged = 'admin.security.password_changed',
  PasswordReset = 'admin.security.password_reset',
  SessionRevoked = 'admin.session.revoked',
  SessionsRevokedAll = 'admin.session.revoked_all',
  EmailSent = 'admin.email.sent',
  EmailFailed = 'admin.email.failed',
  EmailCancelled = 'admin.email.cancelled',
}

type CreateAdminNotificationParams = {
  adminId: AutoIncrementID | string;
  type: AdminNotificationType | string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
};

type NotificationCategory = 'system' | 'security' | 'email';

const DEFAULT_NOTIFICATION_PREFERENCES: Record<NotificationCategory, boolean> =
  {
    system: true,
    security: true,
    email: true,
  };

const NOTIFICATION_TYPE_CATEGORY: Partial<
  Record<AdminNotificationType, NotificationCategory>
> = {
  [AdminNotificationType.NewSession]: 'security',
  [AdminNotificationType.TwoFactorEnabled]: 'security',
  [AdminNotificationType.TwoFactorDisabled]: 'security',
  [AdminNotificationType.PasswordChanged]: 'security',
  [AdminNotificationType.PasswordReset]: 'security',
  [AdminNotificationType.SessionRevoked]: 'security',
  [AdminNotificationType.SessionsRevokedAll]: 'security',
  [AdminNotificationType.EmailSent]: 'email',
  [AdminNotificationType.EmailFailed]: 'email',
  [AdminNotificationType.EmailCancelled]: 'email',
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    private readonly realtimeService: NotificationRealtimeService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async createForAdmin(
    params: CreateAdminNotificationParams,
  ): Promise<NotificationResDto | null> {
    const shouldCreate = await this.shouldCreateForAdmin(
      params.adminId as AutoIncrementID,
      params.type,
    );

    if (!shouldCreate) {
      return null;
    }

    const notification = await this.notificationRepository.save(
      this.notificationRepository.create({
        adminId: params.adminId as AutoIncrementID,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data ?? null,
      }),
    );
    const dto = this.toDto(notification);
    const unreadCount = await this.countUnread(
      params.adminId as AutoIncrementID,
    );

    this.realtimeService.emitNewNotification(String(params.adminId), dto);
    this.realtimeService.emitUnreadCount(String(params.adminId), unreadCount);

    return dto;
  }

  async listMine(
    adminId: AutoIncrementID,
    limit = 20,
  ): Promise<NotificationResDto[]> {
    const notifications = await this.notificationRepository.find({
      where: { adminId },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 50),
    });

    return plainToInstance(NotificationResDto, notifications, {
      excludeExtraneousValues: true,
    });
  }

  async getUnreadCount(
    adminId: AutoIncrementID,
  ): Promise<NotificationUnreadCountResDto> {
    return plainToInstance(NotificationUnreadCountResDto, {
      unreadCount: await this.countUnread(adminId),
    });
  }

  async markRead(
    adminId: AutoIncrementID,
    notificationId: AutoIncrementID,
  ): Promise<NotificationResDto> {
    const notification = await this.notificationRepository.findOneBy({
      id: notificationId,
      adminId,
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
      await this.emitUnreadCount(adminId);
    }

    return this.toDto(notification);
  }

  async deleteMine(
    adminId: AutoIncrementID,
    notificationId: AutoIncrementID,
  ): Promise<NotificationUnreadCountResDto> {
    const notification = await this.notificationRepository.findOneBy({
      id: notificationId,
      adminId,
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepository.delete({ id: notification.id, adminId });
    await this.emitUnreadCount(adminId);

    return this.getUnreadCount(adminId);
  }

  async markAllRead(
    adminId: AutoIncrementID,
  ): Promise<NotificationUnreadCountResDto> {
    await this.notificationRepository.update(
      { adminId, readAt: IsNull() },
      { readAt: new Date() },
    );
    await this.emitUnreadCount(adminId);

    return plainToInstance(NotificationUnreadCountResDto, { unreadCount: 0 });
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeOldNotifications(): Promise<void> {
    const retentionDays = this.configService.get(
      'app.notificationRetentionDays',
      {
        infer: true,
      },
    );

    if (!retentionDays || retentionDays <= 0) {
      return;
    }

    const olderThan = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000,
    );
    const result = await this.notificationRepository.delete({
      createdAt: LessThan(olderThan),
    });

    if (result.affected) {
      this.logger.log(
        `Purged ${result.affected} notifications older than ${retentionDays} days`,
      );
    }
  }

  private async emitUnreadCount(adminId: AutoIncrementID) {
    this.realtimeService.emitUnreadCount(
      String(adminId),
      await this.countUnread(adminId),
    );
  }

  private async countUnread(adminId: AutoIncrementID) {
    return this.notificationRepository.count({
      where: { adminId, readAt: IsNull() },
    });
  }

  private async shouldCreateForAdmin(
    adminId: AutoIncrementID,
    type: AdminNotificationType | string,
  ) {
    const admin = await this.adminUserRepository.findOne({
      where: { id: adminId },
      select: { id: true, notifications: true },
    });

    if (!admin) {
      return false;
    }

    const preferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(admin.notifications ?? {}),
    };
    const category =
      NOTIFICATION_TYPE_CATEGORY[type as AdminNotificationType] ?? 'system';

    return preferences[category] !== false;
  }

  private toDto(notification: NotificationEntity) {
    return plainToInstance(NotificationResDto, notification, {
      excludeExtraneousValues: true,
    });
  }
}
