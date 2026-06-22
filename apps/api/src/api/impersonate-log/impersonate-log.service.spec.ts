import { EImpersonateHistoryStatus } from '@/constants/entity.enum';
import { JobName } from '@/constants/job.constant';
import { ImpersonateLogService } from './impersonate-log.service';

describe('ImpersonateLogService', () => {
  it('stops expired active impersonation histories and queues an ended email', async () => {
    const now = new Date('2026-06-22T10:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    const history = {
      id: '10',
      sessionId: '20',
      adminId: '30',
      targetUserId: '40',
      status: EImpersonateHistoryStatus.ACTIVE,
      startedAt: new Date('2026-06-22T09:00:00.000Z'),
      expiresAt: new Date('2026-06-22T09:30:00.000Z'),
    };
    const session = {
      id: '20',
      userId: '40',
      impersonatedBy: '30',
      revokedAt: null,
    };
    const impersonateLogRepository = {
      find: jest.fn().mockResolvedValue([
        {
          action: 'UPDATE',
          status: 'success',
          entityType: 'UserEntity',
          entityId: '40',
          createdAt: new Date('2026-06-22T09:10:00.000Z'),
        },
      ]),
    };
    const historyRepository = {
      find: jest.fn().mockResolvedValue([history]),
      findOneBy: jest.fn().mockResolvedValue(history),
      save: jest.fn().mockResolvedValue({
        ...history,
        status: EImpersonateHistoryStatus.STOPPED,
        stoppedAt: now,
      }),
    };
    const adminUserRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: '30',
        fullName: 'Admin One',
        email: 'a@e.test',
      }),
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: '40',
        fullName: 'User One',
        email: 'u@e.test',
      }),
    };
    const sessionRepository = {
      findOneBy: jest.fn().mockResolvedValue(session),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const emailQueue = { add: jest.fn() };
    const cacheManager = { set: jest.fn() };
    const configService = { getOrThrow: jest.fn().mockReturnValue('365d') };

    const service = new ImpersonateLogService(
      configService as any,
      impersonateLogRepository as any,
      historyRepository as any,
      adminUserRepository as any,
      userRepository as any,
      sessionRepository as any,
      emailQueue as any,
      cacheManager as any,
    );

    await service.stopExpiredImpersonationHistories();

    expect(sessionRepository.update).toHaveBeenCalled();
    expect(cacheManager.set).toHaveBeenCalled();
    expect(historyRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: EImpersonateHistoryStatus.STOPPED,
        stoppedAt: now,
      }),
    );
    expect(emailQueue.add).toHaveBeenCalledWith(
      JobName.USER_IMPERSONATION_ENDED,
      expect.objectContaining({
        email: 'u@e.test',
        adminName: 'Admin One',
        actions: [
          expect.objectContaining({
            label: 'Updated user #40',
            status: 'Completed',
          }),
        ],
      }),
      expect.any(Object),
    );

    jest.useRealTimers();
  });
});
