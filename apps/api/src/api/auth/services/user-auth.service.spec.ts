import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { ESessionUserType } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { QueueName } from '@/constants/job.constant';
import { verifyPassword } from '@/utils/password.util';
import { getQueueToken } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionEntity } from '../entities/session.entity';
import { UserAccountEntity } from '../entities/user-account.entity';
import { AuthSessionService } from './auth-session.service';
import { UserAccountRecoveryService } from './user-account-recovery.service';
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
  let userAccountRepository: Partial<
    Record<keyof Repository<UserAccountEntity>, jest.Mock>
  >;
  let jwtService: { signAsync: jest.Mock; verify: jest.Mock };
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let emailQueue: { add: jest.Mock };
  let authSessionService: {
    blacklistSession: jest.Mock;
    clearSessionBlacklist: jest.Mock;
  };
  let userAccountRecoveryService: Partial<
    Record<keyof UserAccountRecoveryService, jest.Mock>
  >;

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
    userAccountRepository = {
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
    userAccountRecoveryService = {
      sendVerificationEmail: jest.fn(),
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
          provide: getRepositoryToken(UserAccountEntity),
          useValue: userAccountRepository,
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
        {
          provide: UserAccountRecoveryService,
          useValue: userAccountRecoveryService,
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

    it('creates a user, creates local account, stores a verification token, and queues email', async () => {
      const user = new UserEntity({
        id: '10' as any,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });

      jest.spyOn(UserEntity, 'exists').mockResolvedValue(false);
      userRepository.save.mockResolvedValue(user);
      userAccountRepository.save?.mockResolvedValue(
        new UserAccountEntity({ id: '1' as any }),
      );

      const result = await service.signUp(dto);

      expect(userRepository.create).toHaveBeenCalledWith({
        firstName: dto.firstName,
        lastName: dto.lastName || '',
        email: dto.email,
      });
      expect(userRepository.save).toHaveBeenCalledWith(expect.any(UserEntity));
      expect(userAccountRepository.save).toHaveBeenCalledWith(
        expect.any(UserAccountEntity),
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
      });
      const account = new UserAccountEntity({
        id: '1' as any,
        userId: '10' as any,
        password: 'hashed-password',
      });

      userRepository.findOneByOrFail.mockResolvedValue(user);
      userAccountRepository.findOne?.mockResolvedValue(account);
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      const result = await service.changePassword('10' as any, dto);

      expect(account.password).toBe(dto.newPassword);
      expect(userAccountRepository.save).toHaveBeenCalledWith(account);
      expect(result.message).toBe('Change password successfully');
    });

    it('throws when current password is invalid', async () => {
      userRepository.findOneByOrFail.mockResolvedValue(
        new UserEntity({ id: '10' as any }),
      );
      userAccountRepository.findOne?.mockResolvedValue(
        new UserAccountEntity({ id: '1' as any, password: 'hashed-password' }),
      );
      (verifyPassword as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('10' as any, dto),
      ).rejects.toMatchObject({
        response: { errorCode: ErrorCode.E002 },
      });
      expect(userAccountRepository.save).not.toHaveBeenCalled();
    });

    it('throws when new password confirmation does not match', async () => {
      userRepository.findOneByOrFail.mockResolvedValue(
        new UserEntity({ id: '10' as any }),
      );
      userAccountRepository.findOne?.mockResolvedValue(
        new UserAccountEntity({ id: '1' as any, password: 'hashed-password' }),
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
      expect(userAccountRepository.save).not.toHaveBeenCalled();
    });
  });
});
