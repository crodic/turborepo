import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenService } from './auth-token.service';

describe('AuthTokenService', () => {
  let service: AuthTokenService;
  let jwtService: { signAsync: jest.Mock; verify: jest.Mock };

  beforeEach(() => {
    jwtService = {
      signAsync: jest.fn(),
      verify: jest.fn(),
    };
    service = new AuthTokenService(jwtService as unknown as JwtService);
  });

  describe('generateSessionHash', () => {
    it('generates a 64-character SHA256 hex string', () => {
      const hash1 = service.generateSessionHash();
      const hash2 = service.generateSessionHash();

      expect(hash1).toHaveLength(64);
      expect(hash2).toHaveLength(64);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('createTokenPair', () => {
    it('generates accessToken, refreshToken and tokenExpires', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('access-token-123')
        .mockResolvedValueOnce('refresh-token-456');

      const config = {
        secret: 'access-secret',
        expiresIn: '15m',
        refreshSecret: 'refresh-secret',
        refreshExpiresIn: '7d',
      };

      const result = await service.createTokenPair(
        { id: '1', sessionId: '10', hash: 'session-hash' },
        config,
      );

      expect(result.accessToken).toBe('access-token-123');
      expect(result.refreshToken).toBe('refresh-token-456');
      expect(result.tokenExpires).toBeGreaterThan(Date.now());
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyAccessToken', () => {
    it('returns payload when token is valid', () => {
      const payload = { id: '1', sessionId: '10', hash: 'hash' };
      jwtService.verify.mockReturnValue(payload);

      const result = service.verifyAccessToken('valid-token', 'secret');
      expect(result).toEqual(payload);
    });

    it('throws UnauthorizedException when token is invalid', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      expect(() =>
        service.verifyAccessToken('invalid-token', 'secret'),
      ).toThrow(UnauthorizedException);
    });
  });

  describe('verifyRefreshToken', () => {
    it('returns payload when refresh token is valid', () => {
      const payload = { sessionId: '10', hash: 'hash' };
      jwtService.verify.mockReturnValue(payload);

      const result = service.verifyRefreshToken('valid-token', 'secret');
      expect(result).toEqual(payload);
    });

    it('throws UnauthorizedException when refresh token is invalid', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      expect(() =>
        service.verifyRefreshToken('invalid-token', 'secret'),
      ).toThrow(UnauthorizedException);
    });
  });
});
