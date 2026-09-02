import { Cache } from '@nestjs/cache-manager';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialAuthService } from './social-auth.service';

describe('SocialAuthService', () => {
  let service: SocialAuthService;
  let configService: { getOrThrow: jest.Mock };
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'auth.clientUrl') return 'http://localhost:3000';
        return 'test-val';
      }),
    };
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    service = new SocialAuthService(
      configService as unknown as ConfigService<any>,
      cacheManager as unknown as Cache,
    );
  });

  describe('createOAuthState & consumeOAuthState', () => {
    it('creates state and caches it', async () => {
      const state = await service.createOAuthState('user-1');
      expect(typeof state).toBe('string');
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining(state),
        { mode: 'link', userId: 'user-1' },
        10 * 60 * 1000,
      );
    });

    it('consumes valid OAuth state', async () => {
      cacheManager.get.mockResolvedValue({ mode: 'link', userId: 'user-1' });

      const result = await service.consumeOAuthState('valid-state');
      expect(result).toEqual({ mode: 'link', userId: 'user-1' });
      expect(cacheManager.del).toHaveBeenCalled();
    });

    it('throws BadRequestException on invalid or expired OAuth state', async () => {
      cacheManager.get.mockResolvedValue(null);

      await expect(service.consumeOAuthState('invalid-state')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createExchangeToken & consumeExchangeToken', () => {
    it('creates exchange token and saves to cache', async () => {
      const loginRes = {
        userId: '1',
        accessToken: 'a',
        refreshToken: 'r',
        tokenExpires: 123,
      } as any;
      const token = await service.createExchangeToken(loginRes);

      expect(typeof token).toBe('string');
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining(token),
        loginRes,
        5 * 60 * 1000,
      );
    });

    it('consumes exchange token and returns login response', async () => {
      const loginRes = {
        userId: '1',
        accessToken: 'a',
        refreshToken: 'r',
        tokenExpires: 123,
      } as any;
      cacheManager.get.mockResolvedValue(loginRes);

      const result = await service.consumeExchangeToken('exchange-token-123');
      expect(result).toEqual(loginRes);
      expect(cacheManager.del).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when exchange token is missing', async () => {
      cacheManager.get.mockResolvedValue(null);

      await expect(
        service.consumeExchangeToken('non-existent-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('buildClientRedirectUrl', () => {
    it('constructs correct redirect URL with query params', () => {
      const url = service.buildClientRedirectUrl('/auth/oauth/callback', {
        token: 'token-abc',
        status: 'success',
      });

      expect(url).toBe(
        'http://localhost:3000/auth/oauth/callback?token=token-abc&status=success',
      );
    });
  });
});
