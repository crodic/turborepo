import { DomainType } from '@/constants/entity.enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SessionEntity } from './entities/session.entity';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;

  const mockSessionRepository = {
    save: jest.fn(),
    create: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('7d'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: getRepositoryToken(SessionEntity),
          useValue: mockSessionRepository,
        },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    jest.clearAllMocks();
  });

  describe('getSessionById', () => {
    it('should return session from Redis cache if available without querying repository', async () => {
      const cachedSession = {
        id: '10',
        userId: '1',
        domain: DomainType.CLIENT,
        isRevoked: false,
        expiresAt: new Date().toISOString(),
      };
      mockCacheManager.get.mockResolvedValue(cachedSession);

      const result = await service.getSessionById('10');

      expect(result).toBeDefined();
      expect(result?.id).toBe('10');
      expect(mockSessionRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('should fetch from repository and populate Redis cache on cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const dbSession = {
        id: '10',
        userId: '1',
        domain: DomainType.CLIENT,
        isRevoked: false,
      };
      mockSessionRepository.findOneBy.mockResolvedValue(dbSession);

      const result = await service.getSessionById('10');

      expect(result).toEqual(dbSession);
      expect(mockSessionRepository.findOneBy).toHaveBeenCalledWith({
        id: '10',
      });
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('rotateSessionHash', () => {
    it('should update repository and invalidate session cache', async () => {
      await service.rotateSessionHash('10', 'new-hash');

      expect(mockSessionRepository.update).toHaveBeenCalledWith(
        { id: '10' },
        { refreshTokenHash: 'new-hash' },
      );
      expect(mockCacheManager.del).toHaveBeenCalled();
    });
  });

  describe('gracePeriod', () => {
    it('should set and check grace period hash via Redis', async () => {
      await service.setGracePeriodHash('10', 'old-hash', 30);
      expect(mockCacheManager.set).toHaveBeenCalled();

      mockCacheManager.get.mockResolvedValue(true);
      const isValid = await service.isGracePeriodHash('10', 'old-hash');
      expect(isValid).toBe(true);

      mockCacheManager.get.mockResolvedValue(null);
      const isInvalid = await service.isGracePeriodHash(
        '10',
        'nonexistent-hash',
      );
      expect(isInvalid).toBe(false);
    });
  });

  describe('revokeSession', () => {
    it('should update database, invalidate session cache, and blacklist session', async () => {
      mockSessionRepository.update.mockResolvedValue({ affected: 1 });

      await service.revokeSession({
        sessionId: '10',
        userId: '1',
        userType: DomainType.CLIENT,
      });

      expect(mockSessionRepository.update).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled(); // blacklisted
    });
  });
});
