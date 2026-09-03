import { SessionService } from '@/api/session/session.service';
import { TwoFactorService } from '@/api/two-factor/two-factor.service';
import { UserEntity } from '@/api/user/entities/user.entity';
import { UserService } from '@/api/user/user.service';
import { EmailQueueService } from '@/background/queues/email-queue/email-queue.service';
import { DomainType } from '@/constants/entity.enum';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserService: Partial<UserService>;
  let mockAuthSessionService: Partial<SessionService>;
  let mockAdminTwoFactorService: Partial<TwoFactorService>;
  let mockEmailQueueService: Partial<EmailQueueService>;
  let mockJwtService: Partial<JwtService>;
  let mockConfigService: Partial<ConfigService>;
  let mockUserRepository: Partial<Repository<UserEntity>>;

  beforeEach(() => {
    mockConfigService = {
      getOrThrow: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case 'auth.secret':
            return 'jwt-secret';
          case 'auth.expires':
            return '15m';
          case 'auth.refreshSecret':
            return 'refresh-secret';
          case 'auth.refreshExpires':
            return '7d';
          case 'auth.confirmEmailSecret':
            return 'confirm-email-secret';
          case 'auth.confirmEmailExpires':
            return '10m';
          case 'auth.forgotSecret':
            return 'forgot-secret';
          case 'auth.forgotExpires':
            return '10m';
          default:
            return 'test';
        }
      }),
      get: jest.fn().mockReturnValue('test'),
    };

    mockUserService = {
      findByEmailAndDomain: jest.fn(),
      findById: jest.fn(),
      findRolesByCodes: jest.fn().mockResolvedValue([]),
      findDefaultRole: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      save: jest.fn().mockImplementation((u: UserEntity) => Promise.resolve(u)),
      updateLastLogin: jest.fn().mockResolvedValue(undefined),
    };

    mockAuthSessionService = {
      createLoginSession: jest.fn().mockResolvedValue({ id: '1' } as any),
      getSessionById: jest.fn(),
      rotateSessionHash: jest.fn().mockResolvedValue(undefined),
      revokeSession: jest.fn().mockResolvedValue({ affected: 1 } as any),
      revokeAllUserSessions: jest.fn().mockResolvedValue(undefined),
    };

    mockAdminTwoFactorService = {
      createTwoFactorLoginToken: jest.fn().mockResolvedValue('2fa-token'),
    };

    mockEmailQueueService = {
      sendAdminEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendUserEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendAdminEmailForgotPassword: jest.fn().mockResolvedValue(undefined),
      sendUserEmailForgotPassword: jest.fn().mockResolvedValue(undefined),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mocked-token'),
      signAsync: jest.fn().mockResolvedValue('mocked-async-token'),
      verify: jest.fn(),
    };

    mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
    };

    service = new AuthService(
      mockUserService as UserService,
      mockAuthSessionService as SessionService,
      mockAdminTwoFactorService as TwoFactorService,
      mockEmailQueueService as EmailQueueService,
      mockJwtService as JwtService,
      mockConfigService as ConfigService<any>,
      mockUserRepository as Repository<UserEntity>,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      (mockUserService.findByEmailAndDomain as jest.Mock).mockResolvedValue({
        id: '1',
      });

      await expect(
        service.register({
          email: 'existing@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and send verification email', async () => {
      (mockUserService.findByEmailAndDomain as jest.Mock).mockResolvedValue(
        null,
      );
      (mockUserService.create as jest.Mock).mockResolvedValue({ id: '1' });
      (mockUserService.findById as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'new@example.com',
        domain: DomainType.CLIENT,
        roles: [],
      });

      const result = await service.register({
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(mockUserService.create).toHaveBeenCalled();
      expect(
        mockEmailQueueService.sendUserEmailVerification,
      ).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      (mockJwtService.verify as jest.Mock).mockReturnValue({
        sub: '1',
        email: 'test@example.com',
        domain: DomainType.CLIENT,
        type: 'email-verification',
      });
      (mockUserService.findById as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        domain: DomainType.CLIENT,
        isEmailVerified: false,
      });

      const result = await service.verifyEmail(
        'valid-token',
        DomainType.CLIENT,
      );
      expect(result).toEqual({ message: 'Email verified successfully' });
      expect(mockUserService.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      (mockJwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid');
      });

      await expect(
        service.verifyEmail('invalid-token', DomainType.CLIENT),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword', () => {
    it('should send forgot password email if active user exists', async () => {
      (mockUserService.findByEmailAndDomain as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'active@example.com',
        status: 'active',
        domain: DomainType.CLIENT,
      });

      const result = await service.forgotPassword(
        { email: 'active@example.com' },
        DomainType.CLIENT,
      );

      expect(
        mockEmailQueueService.sendUserEmailForgotPassword,
      ).toHaveBeenCalled();
      expect(result.message).toContain('instructions have been sent');
    });
  });

  describe('login', () => {
    it('should throw BadRequestException if user does not exist', async () => {
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'nonexistent@example.com', password: 'Password123!' },
          DomainType.CLIENT,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if password does not match', async () => {
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        password: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash$dummyhash',
        domain: DomainType.CLIENT,
      });

      await expect(
        service.login(
          { email: 'test@example.com', password: 'WrongPassword!' },
          DomainType.CLIENT,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if email is unverified', async () => {
      const hashedPassword = await import('@/utils/password.util').then((m) =>
        m.hashPassword('Password123!'),
      );
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        password: hashedPassword,
        domain: DomainType.CLIENT,
        isEmailVerified: false,
        verifiedAt: null,
      });

      await expect(
        service.login(
          { email: 'test@example.com', password: 'Password123!' },
          DomainType.CLIENT,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return twoFactor token if twoFactor is enabled', async () => {
      const hashedPassword = await import('@/utils/password.util').then((m) =>
        m.hashPassword('Password123!'),
      );
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        password: hashedPassword,
        domain: DomainType.ADMIN,
        isEmailVerified: true,
        verifiedAt: new Date(),
        twoFactor: { isEnabled: true },
      });

      const result = await service.login(
        { email: 'test@example.com', password: 'Password123!' },
        DomainType.ADMIN,
      );

      expect(result.twoFactorRequired).toBe(true);
      expect(result.twoFactorToken).toBe('2fa-token');
    });

    it('should return authResponse on valid credentials', async () => {
      const hashedPassword = await import('@/utils/password.util').then((m) =>
        m.hashPassword('Password123!'),
      );
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        password: hashedPassword,
        domain: DomainType.CLIENT,
        isEmailVerified: true,
        verifiedAt: new Date(),
        roles: [],
      });

      const result = await service.login(
        { email: 'test@example.com', password: 'Password123!' },
        DomainType.CLIENT,
      );

      expect(result.accessToken).toBe('mocked-async-token');
      expect(result.refreshToken).toBe('mocked-async-token');
      expect(mockUserService.updateLastLogin).toHaveBeenCalledWith('1');
    });
  });

  describe('changePassword', () => {
    it('should throw BadRequestException if new password is missing', async () => {
      (mockUserService.findById as jest.Mock).mockResolvedValue({
        id: '1',
        password: 'hash',
      });

      await expect(
        service.changePassword('1' as any, {
          password: 'old',
          newPassword: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update password successfully', async () => {
      const hashedPassword = await import('@/utils/password.util').then((m) =>
        m.hashPassword('OldPassword123!'),
      );
      const user = {
        id: '1',
        password: hashedPassword,
      };
      (mockUserService.findById as jest.Mock).mockResolvedValue(user);

      const result = await service.changePassword('1' as any, {
        password: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });

      expect(result.message).toBe('Password changed successfully');
      expect(mockUserService.save).toHaveBeenCalled();
    });
  });
});
