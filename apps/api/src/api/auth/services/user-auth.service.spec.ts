import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { CacheKey } from '@/constants/cache.constant';
import { ESessionUserType } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { JobName, QueueName } from '@/constants/job.constant';
import { createCacheKey } from '@/utils/cache.util';
import { verifyPassword } from '@/utils/password.util';
import { getQueueToken } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { SessionEntity } from '../entities/session.entity';
import { UserSocialAccountEntity } from '../entities/user-social-account.entity';
import { AuthSessionService } from './auth-session.service';
import { UserAuthService } from './user-auth.service';

jest.mock('@/utils/password.util', () => ({
  verifyPassword: jest.fn(),
}));

describe('UserAuthService', () => {
  let service: UserAuthService;
  let userRepository: Partial<Record<keyof Repository<UserEntity>, jest.Mock>>;
  let adminUserRepository: Partial<
    Record<keyof Repository<AdminUserEntity>, jest.Mock>
  >;
  let sessionRepository: Partial<
    Record<keyof Repository<SessionEntity>, jest.Mock>
  >;
  let socialAccountRepository: Partial<
    Record<keyof Repository<UserSocialAccountEntity>, jest.Mock>
  >;
  let jwtService: { signAsync: jest.Mock; verify: jest.Mock };
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let emailQueue: { add: jest.Mock };
  let authSessionService: {
    blacklistSession: jest.Mock;
    clearSessionBlacklist: jest.Mock;
  };

  const configValues: Record<string, string> = {
    'auth.userConfirmEmailExpires': '1d',
    'auth.userConfirmEmailSecret': 'confirm-secret',
    'auth.userForgotExpires': '15m',
    'auth.userForgotSecret': 'forgot-secret',
    'auth.userSecret': 'access-secret',
    'auth.userExpires': '2m',
    'auth.userRefreshSecret': 'refresh-secret',
    'auth.userRefreshExpires': '365d',
    'auth.clientResetPasswordUrl': 'http://localhost:3000/auth/reset-password',
  };

  beforeAll(async () => {
    userRepository = {
      create: jest.fn((data) => new UserEntity(data)),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      findOneByOrFail: jest.fn(),
      findOneOrFail: jest.fn(),
      save: jest.fn(),
    };
    adminUserRepository = {
      findOne: jest.fn(),
    };
    sessionRepository = {
      create: jest.fn((data) => new SessionEntity(data)),
      find: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    socialAccountRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
      verify: jest.fn(),
    };
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    emailQueue = {
      add: jest.fn(),
    };
    authSessionService = {
      blacklistSession: jest.fn(),
      clearSessionBlacklist: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAuthService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => configValues[key]),
          },
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(AdminUserEntity),
          useValue: adminUserRepository,
        },
        {
          provide: getRepositoryToken(SessionEntity),
          useValue: sessionRepository,
        },
        {
          provide: getRepositoryToken(UserSocialAccountEntity),
          useValue: socialAccountRepository,
        },
        {
          provide: getQueueToken(QueueName.EMAIL),
          useValue: emailQueue,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: AuthSessionService,
          useValue: authSessionService,
        },
      ],
    }).compile();

    service = module.get(UserAuthService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    (verifyPassword as jest.Mock).mockReset();
  });

  describe('signUp', () => {
    const dto = {
      firstName: 'Test',
      lastName: 'User',
      email: 'user@example.com',
      password: 'secret1',
      roleId: '1' as any,
    };

    it('creates a user, stores a verification token, and queues email', async () => {
      const user = new UserEntity({ id: '10' as any, email: dto.email });

      jest.spyOn(UserEntity, 'exists').mockResolvedValue(false);
      userRepository.save.mockResolvedValue(user);
      jwtService.signAsync.mockResolvedValue('verify-token');

      const result = await service.signUp(dto);

      expect(userRepository.create).toHaveBeenCalledWith({
        firstName: dto.firstName,
        lastName: dto.lastName || '',
        email: dto.email,
        password: dto.password,
      });
      expect(userRepository.save).toHaveBeenCalledWith(expect.any(UserEntity));
      expect(cacheManager.set).toHaveBeenCalledWith(
        createCacheKey(CacheKey.EMAIL_VERIFICATION, user.id),
        'verify-token',
        86400000,
      );
      expect(emailQueue.add).toHaveBeenCalledWith(
        JobName.USER_EMAIL_VERIFICATION,
        { email: dto.email, token: 'verify-token' },
        { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
      );
      expect(result).toEqual(expect.objectContaining({ userId: user.id }));
    });

    it('throws when the email already exists', async () => {
      jest.spyOn(UserEntity, 'exists').mockResolvedValue(true);

      await expect(service.signUp(dto)).rejects.toMatchObject({
        response: { errorCode: ErrorCode.E003 },
      });
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(emailQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('stores reset token and returns redirect URL', async () => {
      const user = new UserEntity({
        id: '10' as any,
        email: 'user@example.com',
      });

      userRepository.findOneOrFail.mockResolvedValue(user);
      jwtService.signAsync.mockResolvedValue('forgot-token');

      const result = await service.forgotPassword({ email: user.email });

      expect(cacheManager.set).toHaveBeenCalledWith(
        createCacheKey(CacheKey.FORGOT_PASSWORD, user.id),
        'forgot-token',
        900000,
      );
      expect(emailQueue.add).toHaveBeenCalledWith(
        JobName.USER_EMAIL_FORGOT_PASSWORD,
        { email: user.email, token: 'forgot-token' },
        { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
      );
      expect(result.redirect).toBe(
        'http://localhost:3000/auth/reset-password?token=forgot-token',
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('returns payload when token is valid and session is active', async () => {
      const payload = {
        id: '10',
        sessionId: '20',
        hash: 'session-hash',
        iat: 9999999000,
        exp: 9999999999,
      };

      jwtService.verify.mockReturnValue(payload);
      cacheManager.get.mockResolvedValue(false);
      sessionRepository.findOneBy.mockResolvedValue(
        new SessionEntity({
          id: '20' as any,
          userId: '10' as any,
          userType: ESessionUserType.USER,
          hash: 'session-hash',
        }),
      );

      await expect(service.verifyAccessToken('access-token')).resolves.toEqual(
        payload,
      );
    });

    it('throws unauthorized when jwt verification fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.verifyAccessToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws unauthorized when the session is blacklisted', async () => {
      jwtService.verify.mockReturnValue({
        id: '10',
        sessionId: '20',
        hash: 'session-hash',
        iat: 9999999000,
        exp: 9999999999,
      });
      cacheManager.get.mockResolvedValue(true);

      await expect(service.verifyAccessToken('access-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws unauthorized when the session no longer exists', async () => {
      jwtService.verify.mockReturnValue({
        id: '10',
        sessionId: '20',
        hash: 'session-hash',
        iat: 9999999000,
        exp: 9999999999,
      });
      cacheManager.get.mockResolvedValue(false);
      sessionRepository.findOneBy.mockResolvedValue(null);

      await expect(service.verifyAccessToken('access-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws unauthorized when the token hash does not match the session', async () => {
      jwtService.verify.mockReturnValue({
        id: '10',
        sessionId: '20',
        hash: 'old-session-hash',
        iat: 9999999000,
        exp: 9999999999,
      });
      cacheManager.get.mockResolvedValue(false);
      sessionRepository.findOneBy.mockResolvedValue(
        new SessionEntity({
          id: '20' as any,
          userId: '10' as any,
          userType: ESessionUserType.USER,
          hash: 'new-session-hash',
        }),
      );

      await expect(service.verifyAccessToken('access-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('blacklists and revokes the current session', async () => {
      await service.logout({
        id: '10',
        sessionId: '20',
        iat: Math.floor(new Date('2026-06-19T00:00:00.000Z').getTime() / 1000),
        exp: Math.floor(new Date('2026-06-19T00:10:00.000Z').getTime() / 1000),
      });

      expect(authSessionService.blacklistSession).toHaveBeenCalledWith(
        '20',
        ESessionUserType.USER,
      );
      expect(sessionRepository.update).toHaveBeenCalledWith(
        {
          id: '20',
          userId: '10',
          userType: ESessionUserType.USER,
          revokedAt: IsNull(),
        },
        { revokedAt: expect.any(Date) },
      );
    });
  });

  describe('changePassword', () => {
    const dto = {
      password: 'oldpass1',
      newPassword: 'newpass1',
      confirmNewPassword: 'newpass1',
    };

    it('changes password when current password and confirmation are valid', async () => {
      const user = new UserEntity({
        id: '10' as any,
        email: 'user@example.com',
        password: 'hashed-password',
      });

      userRepository.findOneByOrFail.mockResolvedValue(user);
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      const result = await service.changePassword('10' as any, dto);

      expect(user.password).toBe(dto.newPassword);
      expect(userRepository.save).toHaveBeenCalledWith(user);
      expect(result.message).toBe('Change password successfully');
    });

    it('throws when current password is invalid', async () => {
      userRepository.findOneByOrFail.mockResolvedValue(
        new UserEntity({ id: '10' as any, password: 'hashed-password' }),
      );
      (verifyPassword as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('10' as any, dto),
      ).rejects.toMatchObject({
        response: { errorCode: ErrorCode.E002 },
      });
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('throws when new password confirmation does not match', async () => {
      userRepository.findOneByOrFail.mockResolvedValue(
        new UserEntity({ id: '10' as any, password: 'hashed-password' }),
      );
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      await expect(
        service.changePassword('10' as any, {
          ...dto,
          confirmNewPassword: 'different1',
        }),
      ).rejects.toMatchObject({
        response: { errorCode: ErrorCode.E003 },
      });
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });
});
