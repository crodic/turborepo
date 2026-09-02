import { UserEntity } from '@/api/user/entities/user.entity';
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
  let userRepoMock: Partial<Record<keyof Repository<UserEntity>, jest.Mock>>;
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
    userRepoMock = {
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
          provide: getRepositoryToken(UserEntity),
          useValue: userRepoMock,
        },
        {
          provide: NotificationRealtimeService,
          useValue: realtimeServiceMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(30),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createForAdmin preference checks', () => {
    it('creates and emits notification when admin has default settings', async () => {
      userRepoMock.findOne!.mockResolvedValue({
        id: '1',
        adminProfile: { notifications: { security: true } },
      });
      notificationRepoMock.save!.mockResolvedValue({
        id: '10',
        userId: '1',
        type: AdminNotificationType.NewSession,
        title: baseParams.title,
        message: baseParams.message,
        data: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      notificationRepoMock.count!.mockResolvedValue(1);

      const result = await service.createForAdmin({
        ...baseParams,
        type: AdminNotificationType.NewSession,
      });

      expect(result).toBeDefined();
      expect(notificationRepoMock.save).toHaveBeenCalled();
      expect(realtimeServiceMock.emitNewNotification).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ id: '10' }),
      );
      expect(realtimeServiceMock.emitUnreadCount).toHaveBeenCalledWith('1', 1);
    });

    it('skips notification when preference is explicitly false', async () => {
      userRepoMock.findOne!.mockResolvedValue({
        id: '1',
        adminProfile: { notifications: { security: false } },
      });

      const result = await service.createForAdmin({
        ...baseParams,
        type: AdminNotificationType.TwoFactorEnabled,
      });

      expect(result).toBeNull();
      expect(notificationRepoMock.save).not.toHaveBeenCalled();
      expect(realtimeServiceMock.emitNewNotification).not.toHaveBeenCalled();
    });

    it('creates notification when other preferences are disabled', async () => {
      userRepoMock.findOne!.mockResolvedValue({
        id: '1',
        adminProfile: {
          notifications: { email: false, system: false, security: true },
        },
      });
      notificationRepoMock.save!.mockResolvedValue({
        id: '11',
        userId: '1',
        type: AdminNotificationType.PasswordChanged,
        title: baseParams.title,
        message: baseParams.message,
        data: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      notificationRepoMock.count!.mockResolvedValue(3);

      const result = await service.createForAdmin({
        ...baseParams,
        type: AdminNotificationType.PasswordChanged,
      });

      expect(result).toBeDefined();
      expect(notificationRepoMock.save).toHaveBeenCalled();
    });

    it('returns null if admin does not exist', async () => {
      userRepoMock.findOne!.mockResolvedValue(null);

      const result = await service.createForAdmin({
        ...baseParams,
        type: AdminNotificationType.NewSession,
      });

      expect(result).toBeNull();
      expect(notificationRepoMock.save).not.toHaveBeenCalled();
    });
  });
});
