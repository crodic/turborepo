import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { AdminAccountEntity } from '@/api/auth/entities/admin-account.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import { NotificationService } from '@/api/notification/notification.service';
import { UserEntity } from '@/api/user/entities/user.entity';
import { verifyPassword } from '@/utils/password.util';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AdminAccountRecoveryService } from './admin-account-recovery.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminTwoFactorService } from './admin-two-factor.service';
import { AuthSessionService } from './auth-session.service';
import { AuthTokenService } from './auth-token.service';

jest.mock('@/utils/password.util', () => ({
  verifyPassword: jest.fn(),
}));

describe('AdminAuthService login', () => {
  let service: AdminAuthService;
  let adminUserRepository: Partial<
    Record<keyof Repository<AdminUserEntity>, jest.Mock>
  >;
  let adminAccountRepository: Partial<
    Record<keyof Repository<AdminAccountEntity>, jest.Mock>
  >;
  let sessionRepository: Partial<
    Record<keyof Repository<SessionEntity>, jest.Mock>
  >;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;
  let emailQueue: { add: jest.Mock };
  let notificationService: { createForAdmin: jest.Mock };
  let cacheManager: { del: jest.Mock; get: jest.Mock; set: jest.Mock };
  let authSessionService: Partial<Record<keyof AuthSessionService, jest.Mock>>;
  let twoFactorService: Partial<Record<keyof AdminTwoFactorService, jest.Mock>>;
  let accountRecoveryService: Partial<
    Record<keyof AdminAccountRecoveryService, jest.Mock>
  >;
  let sessionIdSequence: number;

  const admin = {
    id: '1',
    email: 'admin@example.com',
    password: 'hashed-password',
    twoFactorEnabled: false,
    verifiedAt: new Date(),
  } as AdminUserEntity;

  const adminAccount = {
    id: '1',
    adminUserId: '1',
    provider: 'local',
    providerAccountId: 'admin@example.com',
    password: 'hashed-password',
  };

  beforeEach(() => {
    sessionIdSequence = 10;
    adminUserRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
    };
    adminAccountRepository = {
      findOne: jest.fn().mockResolvedValue(adminAccount),
      save: jest.fn(),
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
      createLoginSession: jest.fn(async (params) => ({
        id: String(sessionIdSequence++),
        userId: params.userId,
        userType: params.userType,
        hash: params.hash,
        createdAt: new Date('2026-06-30T08:00:00.000Z'),
      })),
    };
    const authTokenService = new AuthTokenService(jwtService as any);
    twoFactorService = {
      consumeBackupCode: jest.fn(),
      createTwoFactorLoginToken: jest.fn(),
      verifyTotpCode: jest.fn(),
      decryptTwoFactorSecret: jest.fn(),
    };
    accountRecoveryService = {
      sendVerificationEmail: jest.fn(),
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
      {
        disk: jest.fn(() => ({
          delete: jest.fn(),
          put: jest.fn(),
        })),
      } as any,
      authTokenService,
      adminUserRepository as any,
      adminAccountRepository as any,
      sessionRepository as any,
      {} as Repository<UserEntity>,
      emailQueue as any,
      cacheManager as any,
      notificationService as unknown as NotificationService,
      authSessionService as unknown as AuthSessionService,
      twoFactorService as unknown as AdminTwoFactorService,
      accountRecoveryService as unknown as AdminAccountRecoveryService,
    );

    (verifyPassword as jest.Mock).mockResolvedValue(true);
    adminUserRepository.findOne?.mockResolvedValue(admin);
  });

  it('signs in admin successfully with valid credentials', async () => {
    const result = await service.login(
      { email: admin.email, password: 'password' },
      { ipAddress: '127.0.0.1', userAgent: 'Chrome' },
    );

    expect(result.userId).toBe('1');
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(authSessionService.createLoginSession).toHaveBeenCalled();
  });

  it('requires 2fa when two-factor is enabled on admin', async () => {
    const twoFactorAdmin = {
      ...admin,
      twoFactorEnabled: true,
      twoFactorSecret: 'encrypted-secret',
    } as AdminUserEntity;
    adminUserRepository.findOne?.mockResolvedValue(twoFactorAdmin);
    twoFactorService.createTwoFactorLoginToken?.mockResolvedValue(
      'two-factor-token',
    );

    const result = await service.login(
      { email: admin.email, password: 'password' },
      { ipAddress: '127.0.0.1', userAgent: 'Chrome' },
    );

    expect(result.twoFactorRequired).toBe(true);
    expect(result.twoFactorToken).toBe('two-factor-token');
    expect(result.twoFactorMethods).toEqual(['totp', 'backup_code']);
    expect(sessionRepository.save).not.toHaveBeenCalled();
  });
});
