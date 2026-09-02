import { EmailLogEntity } from '@/api/email/entities/email-log.entity';
import { NotificationEntity } from '@/api/notification/entities/notification.entity';
import { SessionEntity } from '@/api/session/entities/session.entity';
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
    const targetEntity = event.entity ?? event.databaseEntity ?? {};
    const entityId =
      event.entity?.id ?? event.databaseEntity?.id ?? event.entityId;

    if (
      (!event.entity && !event.databaseEntity) ||
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
    const changedFields: string[] = [];

    const keysToInspect = new Set([
      ...Object.keys(event.databaseEntity ?? {}),
      ...Object.keys(event.entity ?? {}),
    ]);

    for (const key of keysToInspect) {
      if (excludeFields.includes(key)) continue;
      const oldVal = event.databaseEntity?.[key];
      const newVal = event.entity?.[key];

      if (oldVal !== undefined) oldValue[key] = oldVal;
      if (newVal !== undefined) newValue[key] = newVal;

      if (
        action === 'UPDATE' &&
        oldVal !== undefined &&
        newVal !== undefined &&
        !['updatedAt', 'updated_at', 'createdAt', 'created_at', 'id'].includes(
          key,
        )
      ) {
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changedFields.push(key);
        }
      }
    }

    const userType = cls.get('userType') || 'GuestEntity';

    if (userType === 'AdminUserEntity') {
      const entityName = this.extractEntityIdentifier(targetEntity);
      const entityLabel = this.formatEntityName(event.metadata.name);

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
            (currentUser?.firstName || currentUser?.lastName
              ? `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim()
              : null) ??
            currentUser?.name ??
            null,
          entityName,
          entityLabel,
          changedFields: changedFields.length > 0 ? changedFields : undefined,
          roles: currentUser?.roles?.map((role: any) => role.name) ?? [],
          userType,
        },
        description: this.buildDescription({
          action,
          entityType: event.metadata.name,
          entityId,
          entityIdentifier: entityName,
          changedFields,
        }),
      });

      setImmediate(() => auditRepo.save(log));
    }
  }

  private formatEntityName(rawName: string): string {
    if (!rawName) return 'Resource';
    const nameWithoutEntity = rawName.replace(/Entity$/, '');
    const customMap: Record<string, string> = {
      AdminUser: 'Admin User',
      User: 'User',
      Role: 'Role',
      Permission: 'Permission',
      CmsPage: 'CMS Page',
      CmsPageTranslation: 'CMS Page Translation',
      EmailLog: 'Email Log',
      Notification: 'Notification',
      Setting: 'Setting',
      WhiteLabel: 'White Label',
      File: 'File',
      UserAccount: 'User Account',
      AdminAccount: 'Admin Account',
    };
    if (customMap[nameWithoutEntity]) {
      return customMap[nameWithoutEntity];
    }
    return nameWithoutEntity.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  }

  private extractEntityIdentifier(entity: any): string | null {
    if (!entity) return null;
    if (entity.name && typeof entity.name === 'string')
      return entity.name.trim();
    if (entity.fullName && typeof entity.fullName === 'string')
      return entity.fullName.trim();
    if (entity.firstName || entity.lastName) {
      const fullName =
        `${entity.firstName ?? ''} ${entity.lastName ?? ''}`.trim();
      if (fullName) return fullName;
    }
    if (entity.title && typeof entity.title === 'string')
      return entity.title.trim();
    if (entity.email && typeof entity.email === 'string')
      return entity.email.trim();
    if (entity.username && typeof entity.username === 'string')
      return entity.username.trim();
    if (entity.key && typeof entity.key === 'string') return entity.key.trim();
    if (entity.slug && typeof entity.slug === 'string')
      return entity.slug.trim();
    if (entity.originalName && typeof entity.originalName === 'string')
      return entity.originalName.trim();
    if (entity.fileName && typeof entity.fileName === 'string')
      return entity.fileName.trim();
    return null;
  }

  private buildDescription({
    action,
    entityType,
    entityId,
    entityIdentifier,
    changedFields = [],
  }: {
    action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'SOFT_DELETE';
    entityType: string;
    entityId: string | number;
    entityIdentifier?: string | null;
    changedFields?: string[];
  }): string {
    const formattedEntity = this.formatEntityName(entityType);
    const targetLabel = entityIdentifier
      ? `${formattedEntity} "${entityIdentifier}" (#${entityId})`
      : `${formattedEntity} (#${entityId})`;

    switch (action) {
      case 'INSERT':
        return `Created ${targetLabel}`;
      case 'UPDATE': {
        if (changedFields.length > 0) {
          const fieldsStr =
            changedFields.length <= 4
              ? changedFields.join(', ')
              : `${changedFields.slice(0, 3).join(', ')} and ${changedFields.length - 3} more fields`;
          return `Updated ${targetLabel} (changed: ${fieldsStr})`;
        }
        return `Updated ${targetLabel}`;
      }
      case 'SOFT_DELETE':
        return `Moved ${targetLabel} to trash`;
      case 'DELETE':
        return `Permanently deleted ${targetLabel}`;
      case 'RESTORE':
        return `Restored ${targetLabel}`;
      default:
        return `${action} ${targetLabel}`;
    }
  }
}
