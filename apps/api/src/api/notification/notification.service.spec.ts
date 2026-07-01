import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationRealtimeService } from './notification-realtime.service';
import {
  AdminNotificationType,
  NotificationService,
} from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  let notificationRepoMock: Partial<
    Record<keyof Repository<NotificationEntity>, jest.Mock>
  >;
  let adminRepoMock: Partial<
    Record<keyof Repository<AdminUserEntity>, jest.Mock>
  >;
  let realtimeServiceMock: {
    emitNewNotification: jest.Mock;
    emitUnreadCount: jest.Mock;
  };

  const baseParams = {
    adminId: '1',
    title: 'Test notification',
    message: 'Something happened',
  };

  beforeAll(async () => {
    notificationRepoMock = {
      create: jest.fn((data) => data),
      save: jest.fn(),
      count: jest.fn(),
    };
    adminRepoMock = {
      findOne: jest.fn(),
    };
    realtimeServiceMock = {
      emitNewNotification: jest.fn(),
      emitUnreadCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(NotificationEntity),
          useValue: notificationRepoMock,
        },
        {
          provide: getRepositoryToken(AdminUserEntity),
          useValue: adminRepoMock,
        },
        {
          provide: NotificationRealtimeService,
          useValue: realtimeServiceMock,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    notificationRepoMock.count?.mockResolvedValue(3);
  });

  it('creates and emits a notification when the mapped category is enabled', async () => {
    const savedNotification = {
      id: '10',
      adminId: '1',
      type: AdminNotificationType.PasswordChanged,
      title: baseParams.title,
      message: baseParams.message,
      data: { source: 'test' },
      readAt: null,
      createdAt: new Date('2026-06-29T00:00:00.000Z'),
    };

    adminRepoMock.findOne?.mockResolvedValue({
      id: '1',
      notifications: { security: true },
    });
    notificationRepoMock.save?.mockResolvedValue(savedNotification);

    const result = await service.createForAdmin({
      ...baseParams,
      type: AdminNotificationType.PasswordChanged,
      data: { source: 'test' },
    });

    expect(adminRepoMock.findOne).toHaveBeenCalledWith({
      where: { id: '1' },
      select: { id: true, notifications: true },
    });
    expect(notificationRepoMock.create).toHaveBeenCalledWith({
      adminId: '1',
      type: AdminNotificationType.PasswordChanged,
      title: baseParams.title,
      message: baseParams.message,
      data: { source: 'test' },
    });
    expect(notificationRepoMock.save).toHaveBeenCalled();
    expect(realtimeServiceMock.emitNewNotification).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        id: '10',
        type: AdminNotificationType.PasswordChanged,
      }),
    );
    expect(realtimeServiceMock.emitUnreadCount).toHaveBeenCalledWith('1', 3);
    expect(result).toEqual(
      expect.objectContaining({
        id: '10',
        type: AdminNotificationType.PasswordChanged,
      }),
    );
  });

  it('does not create a notification when the mapped category is disabled', async () => {
    adminRepoMock.findOne?.mockResolvedValue({
      id: '1',
      notifications: { email: false },
    });

    const result = await service.createForAdmin({
      ...baseParams,
      type: AdminNotificationType.EmailFailed,
    });

    expect(result).toBeNull();
    expect(notificationRepoMock.create).not.toHaveBeenCalled();
    expect(notificationRepoMock.save).not.toHaveBeenCalled();
    expect(realtimeServiceMock.emitNewNotification).not.toHaveBeenCalled();
    expect(realtimeServiceMock.emitUnreadCount).not.toHaveBeenCalled();
  });

  it('uses the system preference for unknown notification types', async () => {
    adminRepoMock.findOne?.mockResolvedValue({
      id: '1',
      notifications: { system: false, email: true, security: true },
    });

    const result = await service.createForAdmin({
      ...baseParams,
      type: 'admin.future.event',
    });

    expect(result).toBeNull();
    expect(notificationRepoMock.save).not.toHaveBeenCalled();
  });
});
