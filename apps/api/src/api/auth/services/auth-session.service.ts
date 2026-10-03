import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { ESessionUserType } from '@/constants/entity.enum';
import { createCacheKey } from '@/utils/cache.util';
import { normalizeUserAgent } from '@/utils/normalize.util';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import ms, { StringValue } from 'ms';
import { IsNull, Not, Repository } from 'typeorm';
import { SessionResDto } from '../dto/session.res.dto';
import { SessionEntity } from '../entities/session.entity';
import { JwtPayloadType } from '../types/jwt-payload.type';

import { SessionRequestInfo } from '../types/session-request-info.type';

@Injectable()
export class AuthSessionService {
  private readonly logger = new Logger(AuthSessionService.name);

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async createLoginSession(params: {
    userId: AutoIncrementID | string;
    userType: ESessionUserType;
    hash: string;
    requestInfo?: SessionRequestInfo;
  }): Promise<SessionEntity> {
    const session = this.sessionRepository.create({
      userId: params.userId as AutoIncrementID,
      userType: params.userType,
      hash: params.hash,
      ipAddress: params.requestInfo?.ipAddress,
      userAgent: normalizeUserAgent(params.requestInfo?.userAgent),
    });
    const savedSession = await this.sessionRepository.save(session);
    await this.clearSessionBlacklist(savedSession.id);
    return savedSession;
  }

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
    revokedAt?: Date;
  }) {
    const revokedAt = params.revokedAt ?? new Date();
    const result = await this.sessionRepository.update(
      {
        id: params.sessionId as AutoIncrementID,
        userId: params.userId as AutoIncrementID,
        userType: params.userType,
        revokedAt: IsNull(),
      },
      { revokedAt },
    );

    if (result.affected) {
      await this.blacklistSession(params.sessionId, params.userType);
    }

    return result;
  }

  async logout(
    userToken: JwtPayloadType,
    userType: ESessionUserType,
  ): Promise<void> {
    await this.revokeSession({
      sessionId: userToken.sessionId as AutoIncrementID,
      userId: userToken.id as AutoIncrementID,
      userType,
    });
  }

  async listSessions(
    userToken: JwtPayloadType,
    userType: ESessionUserType,
  ): Promise<SessionResDto[]> {
    const sessions = await this.sessionRepository.find({
      where: {
        userId: userToken.id as AutoIncrementID,
        userType,
        revokedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });

    return plainToInstance(
      SessionResDto,
      sessions.map((session) => ({
        ...session,
        isCurrent: String(session.id) === String(userToken.sessionId),
      })),
      { excludeExtraneousValues: true },
    );
  }

  async revokeSessionById(
    userToken: JwtPayloadType,
    userType: ESessionUserType,
    sessionId: AutoIncrementID,
  ): Promise<{ message: string }> {
    const result = await this.revokeSession({
      sessionId,
      userId: userToken.id as AutoIncrementID,
      userType,
    });
    if (!result.affected) {
      throw new NotFoundException('Session not found');
    }
    return { message: 'Session revoked successfully' };
  }

  async revokeAllSessions(
    userToken: JwtPayloadType,
    userType: ESessionUserType,
  ): Promise<{ message: string }> {
    const sessions = await this.sessionRepository.find({
      where: {
        userId: userToken.id as AutoIncrementID,
        id: Not(userToken.sessionId as AutoIncrementID),
        userType,
        revokedAt: IsNull(),
      },
    });

    await Promise.all(
      sessions.map((session) =>
        this.revokeSession({
          sessionId: session.id,
          userId: userToken.id as AutoIncrementID,
          userType,
        }),
      ),
    );

    return { message: 'All other sessions revoked successfully' };
  }
}
