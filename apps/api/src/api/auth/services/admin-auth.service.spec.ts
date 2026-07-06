import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import { NotificationService } from '@/api/notification/notification.service';
import { UserEntity } from '@/api/user/entities/user.entity';
import { verifyPassword } from '@/utils/password.util';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AdminAuthService } from './admin-auth.service';
import { AdminSuspiciousLoginService } from './admin-suspicious-login.service';
import { AuthSessionService } from './auth-session.service';

jest.mock('@/utils/password.util', () => ({
  verifyPassword: jest.fn(),
}));

describe('AdminAuthService suspicious login detection', () => {
  let service: AdminAuthService;
  let adminUserRepository: Partial<
    Record<keyof Repository<AdminUserEntity>, jest.Mock>
  >;
  let sessionRepository: Partial<
    Record<keyof Repository<SessionEntity>, jest.Mock>
  >;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;
  let emailQueue: { add: jest.Mock };
  let notificationService: { createForAdmin: jest.Mock };
  let cacheManager: { del: jest.Mock; get: jest.Mock; set: jest.Mock };
  let authSessionService: {
    blacklistSession: jest.Mock;
    clearSessionBlacklist: jest.Mock;
  };
  let suspiciousLoginService: {
    assess: jest.Mock;
    clearChallenge: jest.Mock;
    clearFailedLoginAttempts: jest.Mock;
    createChallenge: jest.Mock;
    getFailedLoginAttempts: jest.Mock;
    queueEmail: jest.Mock;
    recordFailedLogin: jest.Mock;
    shouldRequireVerification: jest.Mock;
    verifyEmailCode: jest.Mock;
    verifyToken: jest.Mock;
  };
  let sessionIdSequence: number;

  const admin = {
    id: '1',
    email: 'admin@example.com',
    password: 'hashed-password',
    twoFactorEnabled: false,
  } as AdminUserEntity;

  beforeEach(() => {
    sessionIdSequence = 10;
    adminUserRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
    };
    sessionRepository = {
      find: jest.fn(),
      save: jest.fn(async (session: SessionEntity) => ({
        ...session,
        id: String(sessionIdSequence++),
        createdAt: new Date('2026-06-30T08:00:00.000Z'),
      })),
    };
    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
      verify: jest.fn(),
    };
    emailQueue = { add: jest.fn() };
    notificationService = { createForAdmin: jest.fn() };
    cacheManager = { del: jest.fn(), get: jest.fn(), set: jest.fn() };
    authSessionService = {
      blacklistSession: jest.fn(),
      clearSessionBlacklist: jest.fn(),
    };
    suspiciousLoginService = {
      assess: jest.fn().mockResolvedValue({ score: 0, reasons: [] }),
      clearChallenge: jest.fn(),
      clearFailedLoginAttempts: jest.fn(),
      createChallenge: jest.fn(async ({ reasons, user }) => ({
        token: 'suspicious-token',
        methods: user.twoFactorEnabled
          ? ['email', 'totp', 'backup_code']
          : ['email'],
        reasons,
      })),
      getFailedLoginAttempts: jest.fn().mockResolvedValue(0),
      queueEmail: jest.fn(),
      recordFailedLogin: jest.fn(),
      shouldRequireVerification: jest.fn(
        (assessment) => assessment.score >= 60,
      ),
      verifyEmailCode: jest.fn(),
      verifyToken: jest.fn(),
    };

    service = new AdminAuthService(
      {
        getOrThrow: jest.fn((key: string) => {
          const values: Record<string, string> = {
            'auth.expires': '15m',
            'auth.secret': 'access-secret',
            'auth.refreshSecret': 'refresh-secret',
            'auth.refreshExpires': '7d',
          };

          return values[key] ?? 'test-secret';
        }),
      } as any,
      jwtService as any,
      adminUserRepository as any,
      sessionRepository as any,
      {} as Repository<UserEntity>,
      emailQueue as any,
      cacheManager as any,
      notificationService as unknown as NotificationService,
      authSessionService as unknown as AuthSessionService,
      suspiciousLoginService as unknown as AdminSuspiciousLoginService,
    );

    (verifyPassword as jest.Mock).mockResolvedValue(true);
    adminUserRepository.findOne?.mockResolvedValue(admin);
  });

  async function loginWith(ipAddress = '127.0.0.1', userAgent = 'Chrome') {
    await service.login(
      { email: admin.email, password: 'password' },
      { ipAddress, userAgent },
    );

    return sessionRepository.save?.mock.calls.at(-1)?.[0] as SessionEntity;
  }

  it('does not mark the first admin login as suspicious', async () => {
    const savedSession = await loginWith();

    expect(savedSession.isSuspicious).toBe(false);
    expect(savedSession.suspiciousReasons).toBeNull();
    expect(notificationService.createForAdmin).not.toHaveBeenCalled();
    expect(emailQueue.add).not.toHaveBeenCalled();
  });

  it('does not mark a known IP address and user agent as suspicious', async () => {
    const savedSession = await loginWith();

    expect(savedSession.isSuspicious).toBe(false);
    expect(savedSession.suspiciousReasons).toBeNull();
    expect(emailQueue.add).not.toHaveBeenCalled();
  });

  it('marks a new IP address as suspicious without requiring step-up verification', async () => {
    suspiciousLoginService.assess.mockResolvedValue({
      score: 45,
      reasons: ['new_ip_address'],
    });

    await service.login(
      { email: admin.email, password: 'password' },
      { ipAddress: '10.0.0.2', userAgent: 'Chrome' },
    );
    const savedSession = sessionRepository.save?.mock.calls.at(
      -1,
    )?.[0] as SessionEntity;

    expect(savedSession.isSuspicious).toBe(true);
    expect(savedSession.suspiciousReasons).toEqual(['new_ip_address']);
    expect(suspiciousLoginService.queueEmail).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({
        ipAddress: '10.0.0.2',
        userAgent: 'Chrome',
        suspiciousReasons: ['new_ip_address'],
      }),
    );
  });

  it('marks a new user agent as suspicious without requiring step-up verification', async () => {
    suspiciousLoginService.assess.mockResolvedValue({
      score: 15,
      reasons: ['new_device'],
    });

    await service.login(
      { email: admin.email, password: 'password' },
      { ipAddress: '127.0.0.1', userAgent: 'Firefox' },
    );
    const savedSession = sessionRepository.save?.mock.calls.at(
      -1,
    )?.[0] as SessionEntity;

    expect(savedSession.isSuspicious).toBe(true);
    expect(savedSession.suspiciousReasons).toEqual(['new_device']);
  });

  it('requires step-up verification for both new IP address and new user agent', async () => {
    suspiciousLoginService.assess.mockResolvedValue({
      score: 60,
      reasons: ['new_ip_address', 'new_device'],
    });

    const result = await service.login(
      { email: admin.email, password: 'password' },
      { ipAddress: '10.0.0.2', userAgent: 'Firefox' },
    );

    expect(result.suspiciousLoginRequired).toBe(true);
    expect(result.suspiciousLoginToken).toBe('suspicious-token');
    expect(result.suspiciousReasons).toEqual(['new_ip_address', 'new_device']);
    expect(sessionRepository.save).not.toHaveBeenCalled();
    expect(suspiciousLoginService.createChallenge).toHaveBeenCalledWith(
      expect.objectContaining({
        user: admin,
        requestInfo: {
          ipAddress: '10.0.0.2',
          userAgent: 'Firefox',
        },
        reasons: ['new_ip_address', 'new_device'],
      }),
    );
  });

  it('offers email and two-factor methods when a two-factor admin has suspicious login', async () => {
    const twoFactorAdmin = {
      ...admin,
      twoFactorEnabled: true,
      twoFactorSecret: 'encrypted-secret',
    } as AdminUserEntity;
    adminUserRepository.findOne?.mockResolvedValue(twoFactorAdmin);
    suspiciousLoginService.assess.mockResolvedValue({
      score: 60,
      reasons: ['new_ip_address', 'new_device'],
    });

    const result = await service.login(
      { email: admin.email, password: 'password' },
      { ipAddress: '10.0.0.2', userAgent: 'Firefox' },
    );

    expect(result.suspiciousLoginRequired).toBe(true);
    expect(result.suspiciousLoginMethods).toEqual([
      'email',
      'totp',
      'backup_code',
    ]);
    expect(sessionRepository.save).not.toHaveBeenCalled();
  });

  it('creates a suspicious session after email challenge verification', async () => {
    const code = '123456';
    const challengeId = 'challenge-id';
    suspiciousLoginService.verifyToken.mockReturnValue({
      id: admin.id,
      purpose: 'admin-suspicious-login',
      challengeId,
      ipAddress: '10.0.0.2',
      userAgent: 'Firefox',
      reasons: ['new_ip_address', 'new_device'],
    });
    adminUserRepository.findOneBy?.mockResolvedValue(admin);
    suspiciousLoginService.verifyEmailCode.mockResolvedValue(true);

    await service.verifySuspiciousLogin({
      suspiciousLoginToken: 'challenge-token',
      method: 'email',
      code,
    });

    const savedSession = sessionRepository.save?.mock.calls[0][0];

    expect(savedSession.isSuspicious).toBe(true);
    expect(savedSession.suspiciousReasons).toEqual([
      'new_ip_address',
      'new_device',
    ]);
    expect(savedSession.ipAddress).toBe('10.0.0.2');
    expect(savedSession.userAgent).toBe('Firefox');
    expect(notificationService.createForAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'admin.login.suspicious',
        data: expect.objectContaining({
          reasons: ['new_ip_address', 'new_device'],
        }),
      }),
    );
    expect(suspiciousLoginService.clearChallenge).toHaveBeenCalledWith(
      challengeId,
    );
    expect(suspiciousLoginService.queueEmail).not.toHaveBeenCalled();
  });

  it('adds failed password attempts to suspicious reasons on the next successful login', async () => {
    suspiciousLoginService.getFailedLoginAttempts.mockResolvedValue(5);
    suspiciousLoginService.assess.mockResolvedValue({
      score: 70,
      reasons: ['failed_login_attempts'],
    });

    const result = await service.login(
      { email: admin.email, password: 'password' },
      { ipAddress: '127.0.0.1', userAgent: 'Chrome' },
    );

    expect(result.suspiciousLoginRequired).toBe(true);
    expect(result.suspiciousReasons).toEqual(['failed_login_attempts']);
    expect(suspiciousLoginService.assess).toHaveBeenCalledWith(
      admin.id,
      { ipAddress: '127.0.0.1', userAgent: 'Chrome' },
      5,
    );
  });
});
