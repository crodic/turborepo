import { NotificationService } from '@/api/notification/notification.service';
import { SessionEntity } from '@/api/session/entities/session.entity';
import { SessionService } from '@/api/session/session.service';
import { UserEntity } from '@/api/user/entities/user.entity';
import { DomainType } from '@/constants/entity.enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TwoFactorEntity } from './entities/two-factor.entity';
import { TwoFactorService } from './two-factor.service';

describe('TwoFactorService', () => {
  let service: TwoFactorService;

  const mockUserRepo = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
  };

  const mockTwoFactorRepo = {
    findOneBy: jest.fn(),
    create: jest.fn((data) => Object.assign(new TwoFactorEntity(), data)),
    save: jest.fn(),
  };

  const mockSessionRepo = {
    create: jest.fn((data) => Object.assign(new SessionEntity(), data)),
    save: jest.fn((data) => Promise.resolve({ id: 'session-1', ...data })),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'app.name') return 'Crodic';
      return null;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'auth.secret') return 'secret';
      if (key === 'auth.expires') return '15m';
      if (key === 'auth.refreshSecret') return 'refresh-secret';
      if (key === 'auth.refreshExpires') return '7d';
      return 'val';
    }),
  };

  const mockNotificationService = {
    create: jest.fn(),
  };

  const mockSessionService = {
    clearSessionBlacklist: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(TwoFactorEntity),
          useValue: mockTwoFactorRepo,
        },
        {
          provide: getRepositoryToken(SessionEntity),
          useValue: mockSessionRepo,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('twoFactorStatus', () => {
    it('returns enabled false when no twoFactor record found', async () => {
      mockTwoFactorRepo.findOneBy.mockResolvedValue(null);

      const status = await service.twoFactorStatus({ id: '123' } as any);
      expect(status.enabled).toBe(false);
    });

    it('returns enabled true when twoFactor is enabled', async () => {
      mockTwoFactorRepo.findOneBy.mockResolvedValue({ isEnabled: true });

      const status = await service.twoFactorStatus({ id: '123' } as any);
      expect(status.enabled).toBe(true);
    });
  });

  describe('enableTwoFactor for Client', () => {
    it('generates secret and stores client cache with correct key', async () => {
      const user = {
        id: '123',
        email: 'client@example.com',
        password:
          '$argon2id$v=19$m=65536,t=3,p=4$fk/JZ2cLgk44JsJyB7qPLQ$fKfrHrhqTr5JFx9AbQQ9StMbXXZ4xOOa/Nv2x8xx4tc',
      };
      mockUserRepo.findOneOrFail.mockResolvedValue(user);

      // Verify password mock
      jest.spyOn(service as any, 'assertPassword').mockResolvedValue(undefined);

      const res = await service.enableTwoFactor(
        { id: '123' } as any,
        { password: 'Password123!' },
        DomainType.CLIENT,
      );

      expect(mockUserRepo.findOneOrFail).toHaveBeenCalledWith({
        where: { id: '123', domain: DomainType.CLIENT },
      });
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'auth:two-factor-setup:123',
        expect.objectContaining({ secret: expect.any(String) }),
        expect.any(Number),
      );
      expect(res.totpUri).toContain('issuer=Crodic');
      expect(res.backupCodes).toHaveLength(10);
    });
  });

  describe('verifyTwoFactorLogin for Client', () => {
    it('creates a client session with DomainType.CLIENT', async () => {
      mockJwtService.verify.mockReturnValue({
        id: '123',
        purpose: '2fa-login',
      });

      const user = { id: '123', email: 'client@example.com' };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockTwoFactorRepo.findOneBy.mockResolvedValue({
        isEnabled: true,
        secret: 'mock-secret',
      });

      jest.spyOn(service, 'verifyTotpCode').mockResolvedValue(true);
      jest
        .spyOn(service, 'decryptTwoFactorSecret')
        .mockReturnValue('decrypted-secret');

      const result = await service.verifyTwoFactorLogin(
        { code: '123456', twoFactorToken: 'valid-token' },
        DomainType.CLIENT,
      );

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { id: '123', domain: DomainType.CLIENT },
      });
      expect(mockSessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: DomainType.CLIENT,
          userId: '123',
        }),
      );
      expect(result.userId).toBe('123');
      expect(result.accessToken).toBe('mock-jwt-token');
    });
  });
});
