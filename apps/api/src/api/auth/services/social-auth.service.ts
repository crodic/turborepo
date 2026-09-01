import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { createCacheKey } from '@/utils/cache.util';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import ms from 'ms';
import { LoginResDto } from '../dto/users/login.res.dto';

export type OAuthStateValue = {
  mode: 'link';
  userId: AutoIncrementID | string;
};

@Injectable()
export class SocialAuthService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async createOAuthState(userId: AutoIncrementID | string): Promise<string> {
    const state = crypto.randomUUID();

    await this.cacheManager.set<OAuthStateValue>(
      createCacheKey(CacheKey.SOCIAL_OAUTH_STATE, state),
      {
        mode: 'link',
        userId,
      },
      ms('10m'),
    );

    return state;
  }

  async consumeOAuthState(state: string): Promise<OAuthStateValue> {
    const cacheKey = createCacheKey(CacheKey.SOCIAL_OAUTH_STATE, state);
    const value = await this.cacheManager.get<OAuthStateValue>(cacheKey);

    if (!value) {
      throw new BadRequestException('Invalid or expired OAuth state');
    }

    await this.cacheManager.del(cacheKey);
    return value;
  }

  async createExchangeToken(loginResponse: LoginResDto): Promise<string> {
    const exchangeToken = crypto.randomUUID();
    await this.cacheManager.set<LoginResDto>(
      createCacheKey(CacheKey.SOCIAL_OAUTH_EXCHANGE, exchangeToken),
      loginResponse,
      ms('5m'),
    );

    return exchangeToken;
  }

  async consumeExchangeToken(token: string): Promise<LoginResDto> {
    const cacheKey = createCacheKey(CacheKey.SOCIAL_OAUTH_EXCHANGE, token);
    const cached = await this.cacheManager.get<LoginResDto>(cacheKey);

    if (!cached) {
      throw new UnauthorizedException();
    }

    await this.cacheManager.del(cacheKey);
    return cached;
  }

  buildClientRedirectUrl(
    pathname: string,
    query: Record<string, string>,
  ): string {
    const url = new URL(
      pathname,
      this.configService.getOrThrow('auth.clientUrl', { infer: true }),
    );

    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return url.toString();
  }
}
