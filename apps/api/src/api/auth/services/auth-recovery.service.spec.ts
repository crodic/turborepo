import { CacheKey } from '@/constants/cache.constant';
import { ESessionUserType } from '@/constants/entity.enum';
import { Cache } from '@nestjs/cache-manager';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRecoveryService } from './auth-recovery.service';

describe('AuthRecoveryService', () => {
  let service: AuthRecoveryService;
  let jwtService: { signAsync: jest.Mock; verify: jest.Mock };
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(() => {
    jwtService = {
      signAsync: jest.fn(),
      verify: jest.fn(),
    };
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    service = new AuthRecoveryService(
      jwtService as unknown as JwtService,
      cacheManager as unknown as Cache,
    );
  });

  describe('createAndCacheVerificationToken', () => {
    it('signs JWT and saves to cache with correct expiration and scope', async () => {
      jwtService.signAsync.mockResolvedValue('signed-token');

      const result = await service.createAndCacheVerificationToken({
        userId: 'user-1',
        scope: ESessionUserType.USER,
        secret: 'test-secret',
        expiresIn: '15m',
        cacheKeyPrefix: CacheKey.EMAIL_VERIFICATION,
      });

      expect(result.token).toBe('signed-token');
      expect(result.expiresIn).toBe('15m');
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('user-1'),
        'signed-token',
        15 * 60 * 1000,
      );
    });
  });

  describe('verifyAndConsumeToken', () => {
    it('verifies token, checks cache and deletes it', async () => {
      jwtService.verify.mockReturnValue({
        id: 'user-1',
        scope: ESessionUserType.USER,
      });
      cacheManager.get.mockResolvedValue('input-token');

      const result = await service.verifyAndConsumeToken({
        token: 'input-token',
        scope: ESessionUserType.USER,
        secret: 'test-secret',
        cacheKeyPrefix: CacheKey.EMAIL_VERIFICATION,
      });

      expect(result.id).toBe('user-1');
      expect(cacheManager.del).toHaveBeenCalledWith(
        expect.stringContaining('user-1'),
      );
    });

    it('throws BadRequestException if token signature is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(
        service.verifyAndConsumeToken({
          token: 'invalid-token',
          scope: ESessionUserType.USER,
          secret: 'test-secret',
          cacheKeyPrefix: CacheKey.EMAIL_VERIFICATION,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if token scope does not match', async () => {
      jwtService.verify.mockReturnValue({
        id: 'user-1',
        scope: ESessionUserType.ADMIN,
      });

      await expect(
        service.verifyAndConsumeToken({
          token: 'input-token',
          scope: ESessionUserType.USER,
          secret: 'test-secret',
          cacheKeyPrefix: CacheKey.EMAIL_VERIFICATION,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if token is missing from cache', async () => {
      jwtService.verify.mockReturnValue({
        id: 'user-1',
        scope: ESessionUserType.USER,
      });
      cacheManager.get.mockResolvedValue(null);

      await expect(
        service.verifyAndConsumeToken({
          token: 'input-token',
          scope: ESessionUserType.USER,
          secret: 'test-secret',
          cacheKeyPrefix: CacheKey.EMAIL_VERIFICATION,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
