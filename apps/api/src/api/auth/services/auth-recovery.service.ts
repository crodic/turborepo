import { AutoIncrementID } from '@/common/types/common.type';
import { CacheKey } from '@/constants/cache.constant';
import { createCacheKey } from '@/utils/cache.util';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import ms, { StringValue } from 'ms';

export type VerificationTokenPayload = {
  id: string | AutoIncrementID;
};

@Injectable()
export class AuthRecoveryService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async createAndCacheVerificationToken(params: {
    userId: string | AutoIncrementID;
    secret: string;
    expiresIn: string;
    cacheKeyPrefix: CacheKey;
  }): Promise<{ token: string; expiresIn: string }> {
    const token = await this.jwtService.signAsync(
      { id: String(params.userId) },
      {
        secret: params.secret,
        expiresIn: params.expiresIn as StringValue,
      },
    );

    await this.cacheManager.set(
      createCacheKey(params.cacheKeyPrefix, params.userId),
      token,
      ms(params.expiresIn as StringValue),
    );

    return { token, expiresIn: params.expiresIn };
  }

  async verifyAndConsumeToken(params: {
    token: string;
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

    const cacheKey = createCacheKey(params.cacheKeyPrefix, payload.id);
    const cachedToken = await this.cacheManager.get<string>(cacheKey);

    if (!cachedToken) {
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
}
