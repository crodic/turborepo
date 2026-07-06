import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { ESessionUserType } from '@/constants/entity.enum';
import { createCacheKey } from '@/utils/cache.util';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import ms, { StringValue } from 'ms';
import { IsNull, Repository } from 'typeorm';
import { SessionEntity } from '../entities/session.entity';

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async blacklistSession(
    sessionId: AutoIncrementID | string,
    userType: ESessionUserType = ESessionUserType.USER,
  ) {
    const refreshExpiresKey =
      userType === ESessionUserType.ADMIN
        ? 'auth.refreshExpires'
        : 'auth.userRefreshExpires';
    const refreshExpires = this.configService.getOrThrow(refreshExpiresKey, {
      infer: true,
    });

    await this.cacheManager.set<boolean>(
      createCacheKey(CacheKey.SESSION_BLACKLIST, sessionId),
      true,
      ms(refreshExpires as StringValue),
    );
  }

  async clearSessionBlacklist(sessionId: AutoIncrementID | string) {
    await this.cacheManager.del(
      createCacheKey(CacheKey.SESSION_BLACKLIST, sessionId),
    );
  }

  async revokeSession(params: {
    sessionId: AutoIncrementID | string;
    userId: AutoIncrementID | string;
    userType: ESessionUserType;
    impersonatedBy?: AutoIncrementID | string;
    revokedAt?: Date;
  }) {
    const revokedAt = params.revokedAt ?? new Date();
    const result = await this.sessionRepository.update(
      {
        id: params.sessionId as AutoIncrementID,
        userId: params.userId as AutoIncrementID,
        userType: params.userType,
        ...(params.impersonatedBy
          ? { impersonatedBy: params.impersonatedBy as AutoIncrementID }
          : {}),
        revokedAt: IsNull(),
      },
      { revokedAt },
    );

    if (result.affected) {
      await this.blacklistSession(params.sessionId, params.userType);
    }

    return result;
  }
}
