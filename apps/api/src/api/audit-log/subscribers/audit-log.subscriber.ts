import { SessionEntity } from '@/api/auth/entities/session.entity';
import { EmailLogEntity } from '@/api/email/entities/email-log.entity';
import { NotificationEntity } from '@/api/notification/entities/notification.entity';
import { Logger } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RecoverEvent,
  RemoveEvent,
  SoftRemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { AuditLogEntity } from '../entities/audit-log.entity';

@EventSubscriber()
export class AuditLogSubscriber implements EntitySubscriberInterface {
  private readonly logger = new Logger(AuditLogSubscriber.name);
  private readonly ignoreEntities = [
    AuditLogEntity.name,
    SessionEntity.name,
    EmailLogEntity.name,
    NotificationEntity.name,
  ];

  constructor(private dataSource: DataSource) {
    this.dataSource.subscribers.push(this);
  }

  async afterInsert(event: InsertEvent<any>) {
    await this.saveLog('INSERT', event);
  }

  async afterUpdate(event: UpdateEvent<any>) {
    await this.saveLog('UPDATE', event);
  }

  async afterRemove(event: RemoveEvent<any>) {
    await this.saveLog('DELETE', event);
  }

  async afterSoftRemove(event: SoftRemoveEvent<any>) {
    await this.saveLog('SOFT_DELETE', event);
  }

  async afterRecover(event: RecoverEvent<any>) {
    await this.saveLog('RESTORE', event);
  }

  private async saveLog(
    action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'SOFT_DELETE',
    event: any,
  ) {
    const entityId =
      event.entity?.id ?? event.databaseEntity?.id ?? event.entityId;

    if (
      !event.entity ||
      !entityId ||
      this.ignoreEntities.includes(event.metadata.name)
    )
      return;

    const excludeFields = [
      'password',
      'previousPassword',
      'twoFactorSecret',
      'twoFactorBackupCodes',
    ];
    const cls = ClsServiceManager.getClsService();

    const auditRepo = event.manager.getRepository(AuditLogEntity);
    const currentUser = cls.get('user') ?? {};
    const userId = currentUser?.id;

    const oldValue = {};
    const newValue = {};
    for (const key in event.entity) {
      if (excludeFields.includes(key)) continue;
      oldValue[key] = event.databaseEntity?.[key];
      newValue[key] = event.entity?.[key];
    }

    const userType = cls.get('userType') || 'GuestEntity';

    if (userType === 'AdminUserEntity') {
      const log = auditRepo.create({
        entity: event.metadata.name,
        entityId,
        action,
        oldValue,
        newValue,
        userId: userId ?? null,
        ip: cls.get('ip'),
        userAgent: cls.get('userAgent'),
        requestId: cls.get('requestId'),
        timestamp: new Date(),
        metadata: {
          actorId: userId ?? null,
          actorEmail: currentUser?.email ?? null,
          actorName:
            currentUser?.fullName ??
            currentUser?.name ??
            currentUser?.firstName ??
            null,
          entityName:
            event.entity?.name ??
            event.entity?.title ??
            event.entity?.email ??
            event.entity?.username ??
            null,
          roles: currentUser?.roles?.map((role: any) => role.name) ?? [],
          userType,
        },
        description: this.buildDescription(
          action,
          `${event.metadata.name}:${entityId}`,
        ),
      });

      setImmediate(() => auditRepo.save(log));
    }
  }

  private buildDescription = (action: string, entityType: string) => {
    switch (action) {
      case 'INSERT':
        return `New ${entityType} created`;
      case 'UPDATE':
        return `Updated ${entityType}`;
      case 'DELETE':
        return `Deleted ${entityType}`;
      case 'RESTORE':
        return `Restored ${entityType}`;
      case 'SOFT_DELETE':
        return `Soft deleted ${entityType}`;
      default:
        return `${action} ${entityType}`;
    }
  };
}
