import { ClsServiceManager } from 'nestjs-cls';
import { DataSource } from 'typeorm';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { AuditLogSubscriber } from './audit-log.subscriber';

describe('AuditLogSubscriber', () => {
  let subscriber: AuditLogSubscriber;
  let mockDataSource: any;
  let mockAuditRepo: any;

  beforeEach(() => {
    mockDataSource = {
      subscribers: [],
    };
    mockAuditRepo = {
      create: jest.fn((log) => log),
      save: jest.fn().mockResolvedValue(true),
    };
    subscriber = new AuditLogSubscriber(
      mockDataSource as unknown as DataSource,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be registered to dataSource subscribers', () => {
    expect(mockDataSource.subscribers).toContain(subscriber);
  });

  it('generates friendly description on INSERT of an AdminUserEntity', async () => {
    const cls = {
      get: jest.fn((key: string) => {
        if (key === 'user')
          return {
            id: '1',
            fullName: 'Super Admin',
            email: 'admin@domain.com',
            roles: [{ name: 'ADMIN' }],
          };
        if (key === 'userType') return 'AdminUserEntity';
        if (key === 'ip') return '127.0.0.1';
        if (key === 'userAgent') return 'Mozilla/5.0';
        if (key === 'requestId') return 'req-123';
        return null;
      }),
    };
    jest.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(cls as any);

    const event = {
      metadata: { name: 'AdminUserEntity' },
      entity: { id: '10', fullName: 'Jane Doe', email: 'jane@domain.com' },
      manager: {
        getRepository: jest.fn().mockReturnValue(mockAuditRepo),
      },
    };

    await subscriber.afterInsert(event as any);

    expect(mockAuditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'AdminUserEntity',
        entityId: '10',
        action: 'INSERT',
        description: 'Created Admin User "Jane Doe" (#10)',
        metadata: expect.objectContaining({
          actorName: 'Super Admin',
          entityName: 'Jane Doe',
          entityLabel: 'Admin User',
        }),
      }),
    );
  });

  it('generates friendly description with changed fields on UPDATE of RoleEntity', async () => {
    const cls = {
      get: jest.fn((key: string) => {
        if (key === 'user') return { id: '1', name: 'Admin' };
        if (key === 'userType') return 'AdminUserEntity';
        return null;
      }),
    };
    jest.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(cls as any);

    const event = {
      metadata: { name: 'RoleEntity' },
      entity: {
        id: '2',
        name: 'Manager',
        description: 'Updated role description',
      },
      databaseEntity: {
        id: '2',
        name: 'Manager',
        description: 'Old role description',
      },
      manager: {
        getRepository: jest.fn().mockReturnValue(mockAuditRepo),
      },
    };

    await subscriber.afterUpdate(event as any);

    expect(mockAuditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'RoleEntity',
        entityId: '2',
        action: 'UPDATE',
        description: 'Updated Role "Manager" (#2) (changed: description)',
        metadata: expect.objectContaining({
          entityName: 'Manager',
          entityLabel: 'Role',
          changedFields: ['description'],
        }),
      }),
    );
  });

  it('generates friendly description on SOFT_DELETE of CmsPageEntity', async () => {
    const cls = {
      get: jest.fn((key: string) => {
        if (key === 'user') return { id: '1', fullName: 'Admin' };
        if (key === 'userType') return 'AdminUserEntity';
        return null;
      }),
    };
    jest.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(cls as any);

    const event = {
      metadata: { name: 'CmsPageEntity' },
      entity: { id: '5', name: 'Privacy Policy' },
      databaseEntity: { id: '5', name: 'Privacy Policy' },
      manager: {
        getRepository: jest.fn().mockReturnValue(mockAuditRepo),
      },
    };

    await subscriber.afterSoftRemove(event as any);

    expect(mockAuditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'CmsPageEntity',
        entityId: '5',
        action: 'SOFT_DELETE',
        description: 'Moved CMS Page "Privacy Policy" (#5) to trash',
        metadata: expect.objectContaining({
          entityLabel: 'CMS Page',
        }),
      }),
    );
  });

  it('does not log ignored entities like AuditLogEntity or SessionEntity', async () => {
    const event = {
      metadata: { name: AuditLogEntity.name },
      entity: { id: '1' },
      manager: {
        getRepository: jest.fn().mockReturnValue(mockAuditRepo),
      },
    };

    await subscriber.afterInsert(event as any);
    expect(mockAuditRepo.create).not.toHaveBeenCalled();
  });
});
