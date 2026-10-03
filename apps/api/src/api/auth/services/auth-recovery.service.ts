import { AutoIncrementID } from '@/common/types/common.type';
import { CacheKey } from '@/constants/cache.constant';
import { ESessionUserType } from '@/constants/entity.enum';
import { createCacheKey } from '@/utils/cache.util';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import crypto from 'crypto';
import ms, { StringValue } from 'ms';

export type VerificationTokenPayload = {
  id: string | AutoIncrementID;
  /** User table the token was issued for (admin / user). */
  scope?: ESessionUserType;
};

@Injectable()
export class AuthRecoveryService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * Signs a one-time verification token and stores it in cache.
   *
   * Multi-table safety: admin and user IDs come from separate auto-increment
   * sequences and can overlap, so both the cache key and the JWT payload are
   * scoped by `scope` (user type). Issuing a new token overwrites the previous
   * one, which invalidates any older token for the same account.
   */
  async createAndCacheVerificationToken(params: {
    userId: string | AutoIncrementID;
    scope: ESessionUserType;
    secret: string;
    expiresIn: string;
    cacheKeyPrefix: CacheKey;
  }): Promise<{ token: string; expiresIn: string }> {
    const token = await this.jwtService.signAsync(
      { id: String(params.userId), scope: params.scope },
      {
        secret: params.secret,
        expiresIn: params.expiresIn as StringValue,
      },
    );

    await this.cacheManager.set(
      createCacheKey(
        params.cacheKeyPrefix,
        params.scope,
        String(params.userId),
      ),
      token,
      ms(params.expiresIn as StringValue),
    );

    return { token, expiresIn: params.expiresIn };
  }

  /**
   * Verifies the token signature, scope and that it is the latest token issued
   * for this account, then consumes it (single use).
   */
  async verifyAndConsumeToken(params: {
    token: string;
    scope: ESessionUserType;
    secret: string;
    cacheKeyPrefix: CacheKey;
  }): Promise<{ id: string }> {
    let payload: VerificationTokenPayload;
    try {
      payload = this.jwtService.verify<VerificationTokenPayload>(params.token, {
        secret: params.secret,
      });
    } catch {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (!payload?.id || payload.scope !== params.scope) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const cacheKey = createCacheKey(
      params.cacheKeyPrefix,
      params.scope,
      String(payload.id),
    );
    const cachedToken = await this.cacheManager.get<string>(cacheKey);

    if (!cachedToken || !this.safeEqual(cachedToken, params.token)) {
      throw new BadRequestException(
        'Verification token has expired or already used',
      );
    }

    await this.cacheManager.del(cacheKey);
    return { id: String(payload.id) };
  }

  async verifyTokenOnly(params: {
    token: string;
    secret: string;
  }): Promise<{ id: string }> {
    try {
      const payload = this.jwtService.verify<VerificationTokenPayload>(
        params.token,
        { secret: params.secret },
      );
      return { id: String(payload.id) };
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }
  }

  private safeEqual(a: string, b: string): boolean {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return (
      bufferA.length === bufferB.length &&
      crypto.timingSafeEqual(bufferA, bufferB)
    );
  }
}
