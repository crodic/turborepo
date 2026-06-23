import { SessionEntity } from '@/api/auth/entities/session.entity';
import { EmailLogEntity } from '@/api/email/entities/email-log.entity';
import { ImpersonateLogHistoryEntity } from '@/api/impersonate-log/entities/impersonate-log-history.entity';
import { ImpersonateLogEntity } from '@/api/impersonate-log/entities/impersonate-log.entity';
import {
  isMutatingMethod,
  normalizeChangedFields,
  sanitizePayload,
} from '@/api/impersonate-log/impersonate-log.util';
import { NotificationEntity } from '@/api/notification/entities/notification.entity';
import { EImpersonateLogStatus } from '@/constants/entity.enum';
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
    ImpersonateLogEntity.name,
    ImpersonateLogHistoryEntity.name,
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

    const excludeFields = ['password'];
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
    const impersonation = cls.get('impersonation');

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
        roles: currentUser?.roles?.map((role) => role.name) ?? [],
        userType,
        impersonation: impersonation ?? null,
      },
      description: this.buildDescription(
        action,
        `${event.metadata.name}:${entityId}`,
      ),
    });

    setImmediate(() => auditRepo.save(log));
    await this.saveImpersonateLog(action, event, cls);
  }

  private async saveImpersonateLog(
    action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'SOFT_DELETE',
    event: any,
    cls: any,
  ) {
    const impersonation = cls.get('impersonation');
    const method = cls.get('method');

    if (!impersonation || !isMutatingMethod(method)) {
      return;
    }

    const impersonateLogRepo =
      event.manager.getRepository(ImpersonateLogEntity);
    const before = sanitizePayload(event.databaseEntity);
    const after = sanitizePayload(event.entity);

    const log = impersonateLogRepo.create({
      historyId: impersonation.historyId,
      sessionId: impersonation.sessionId,
      adminId: impersonation.adminId,
      targetUserId: impersonation.targetUserId,
      action,
      method: method.toUpperCase(),
      endpoint: cls.get('endpoint') ?? '',
      entityType: event.metadata.name,
      entityId: String(
        event.entity?.id ?? event.databaseEntity?.id ?? event.entityId ?? '',
      ),
      input: sanitizePayload(cls.get('body')),
      output: after,
      before,
      after,
      changedFields: normalizeChangedFields(
        event.updatedColumns?.map((column) => column.propertyName),
        event.databaseEntity,
        event.entity,
      ),
      status: EImpersonateLogStatus.SUCCESS,
      errorMessage: null,
      ipAddress: cls.get('ip'),
      userAgent: cls.get('userAgent'),
    });

    setImmediate(() => impersonateLogRepo.save(log));
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
