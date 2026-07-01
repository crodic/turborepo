import { ESessionUserType } from '@/constants/entity.enum';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { SessionEntity } from '../entities/session.entity';
import { AdminSuspiciousLoginService } from './admin-suspicious-login.service';

describe('AdminSuspiciousLoginService', () => {
  let sessionRepository: Partial<
    Record<keyof Repository<SessionEntity>, jest.Mock>
  >;
  let cacheManager: { del: jest.Mock; get: jest.Mock; set: jest.Mock };
  let service: AdminSuspiciousLoginService;

  function createService(enabled: boolean) {
    sessionRepository = {
      find: jest.fn(),
    };
    cacheManager = { del: jest.fn(), get: jest.fn(), set: jest.fn() };

    service = new AdminSuspiciousLoginService(
      {
        get: jest.fn((key: string) =>
          key === 'auth.suspiciousLoginEnabled' ? enabled : undefined,
        ),
        getOrThrow: jest.fn().mockReturnValue('secret'),
      } as any,
      {} as JwtService,
      sessionRepository as any,
      { add: jest.fn() } as any,
      cacheManager as any,
    );
  }

  it('does nothing when suspicious login is disabled', async () => {
    createService(false);

    const assessment = await service.assess(
      '1',
      { ipAddress: '10.0.0.2', userAgent: 'Firefox' },
      5,
    );
    await service.recordFailedLogin('admin@example.com');

    expect(assessment).toEqual({ score: 0, reasons: [] });
    expect(sessionRepository.find).not.toHaveBeenCalled();
    expect(cacheManager.get).not.toHaveBeenCalled();
    expect(cacheManager.set).not.toHaveBeenCalled();
  });

  it('does not score the first login when enabled', async () => {
    createService(true);
    sessionRepository.find?.mockResolvedValue([]);

    const assessment = await service.assess('1', {
      ipAddress: '10.0.0.2',
      userAgent: 'Firefox',
    });

    expect(assessment).toEqual({ score: 0, reasons: [] });
  });

  it('scores enabled suspicious login signals from previous sessions and failed attempts', async () => {
    createService(true);
    sessionRepository.find?.mockResolvedValue([
      {
        id: '1',
        userId: '1',
        userType: ESessionUserType.ADMIN,
        ipAddress: '127.0.0.1',
        userAgent: 'Chrome',
      },
    ]);

    const assessment = await service.assess(
      '1',
      { ipAddress: '10.0.0.2', userAgent: 'Firefox' },
      5,
    );

    expect(assessment).toEqual({
      score: 130,
      reasons: ['new_ip_address', 'new_device', 'failed_login_attempts'],
    });
    expect(service.shouldRequireVerification(assessment)).toBe(true);
  });
});
