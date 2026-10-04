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
import { IsNull, Repository } from 'typeorm';
import { SessionResDto } from '../dto/session.res.dto';
import { AdminSessionEntity } from '../entities/admin-session.entity';
import { UserSessionEntity } from '../entities/user-session.entity';
import { IAuthSession } from '../interfaces/auth-entity.interface';
import { JwtPayloadType } from '../types/jwt-payload.type';
import { SessionRequestInfo } from '../types/session-request-info.type';

@Injectable()
export class AuthSessionService {
  private readonly logger = new Logger(AuthSessionService.name);

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    @InjectRepository(AdminSessionEntity)
    private readonly adminSessionRepository: Repository<AdminSessionEntity>,
    @InjectRepository(UserSessionEntity)
    private readonly userSessionRepository: Repository<UserSessionEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async createLoginSession(params: {
    userId: AutoIncrementID | string;
    userType: ESessionUserType;
    hash: string;
    requestInfo?: SessionRequestInfo;
  }): Promise<IAuthSession> {
    const userAgent = normalizeUserAgent(params.requestInfo?.userAgent);
    const ipAddress = params.requestInfo?.ipAddress;

    if (params.userType === ESessionUserType.ADMIN) {
      const session = this.adminSessionRepository.create({
        adminUserId: params.userId as AutoIncrementID,
        hash: params.hash,
        ipAddress,
        userAgent,
      });
      const savedSession = await this.adminSessionRepository.save(session);
      await this.clearSessionBlacklist(savedSession.id);
      return savedSession;
    }

    const session = this.userSessionRepository.create({
      userId: params.userId as AutoIncrementID,
      hash: params.hash,
      ipAddress,
      userAgent,
    });
    const savedSession = await this.userSessionRepository.save(session);
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
    const result =
      params.userType === ESessionUserType.ADMIN
        ? await this.adminSessionRepository.update(
            {
              id: params.sessionId as AutoIncrementID,
              adminUserId: params.userId as AutoIncrementID,
              revokedAt: IsNull(),
            },
            { revokedAt },
          )
        : await this.userSessionRepository.update(
            {
              id: params.sessionId as AutoIncrementID,
              userId: params.userId as AutoIncrementID,
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
    const sessions =
      userType === ESessionUserType.ADMIN
        ? await this.adminSessionRepository.find({
            where: {
              adminUserId: userToken.id as AutoIncrementID,
              revokedAt: IsNull(),
            },
            order: { createdAt: 'DESC' },
          })
        : await this.userSessionRepository.find({
            where: {
              userId: userToken.id as AutoIncrementID,
              revokedAt: IsNull(),
            },
            order: { createdAt: 'DESC' },
          });

    return plainToInstance(
      SessionResDto,
      sessions.map((session) => ({
        ...session,
        userId: userToken.id,
        userType,
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
    await this.revokeAllUserSessions({
      userId: userToken.id as AutoIncrementID,
      userType,
      exceptSessionId: userToken.sessionId as AutoIncrementID,
    });

    return { message: 'All other sessions revoked successfully' };
  }

  /**
   * Revokes every active session of an account in a single UPDATE and
   * blacklists them in cache so access tokens stop working immediately.
   * Used after password reset / change and account takeover mitigation.
   */
  async revokeAllUserSessions(params: {
    userId: AutoIncrementID | string;
    userType: ESessionUserType;
    exceptSessionId?: AutoIncrementID | string;
  }): Promise<number> {
    const isParamAdmin = params.userType === ESessionUserType.ADMIN;
    const repo = isParamAdmin
      ? this.adminSessionRepository
      : this.userSessionRepository;
    const entityTarget = isParamAdmin ? AdminSessionEntity : UserSessionEntity;
    const userColumn = isParamAdmin ? 'admin_user_id' : 'user_id';

    const query = repo
      .createQueryBuilder()
      .update(entityTarget)
      .set({ revokedAt: new Date() })
      .where(`${userColumn} = :userId`, { userId: params.userId })
      .andWhere('revoked_at IS NULL');

    if (params.exceptSessionId) {
      query.andWhere('id <> :exceptSessionId', {
        exceptSessionId: params.exceptSessionId,
      });
    }

    const result = await query.returning(['id']).execute();
    const revokedIds = ((result.raw ?? []) as { id: string }[]).map(
      (row) => row.id,
    );

    await Promise.all(
      revokedIds.map((id) => this.blacklistSession(id, params.userType)),
    );

    if (revokedIds.length) {
      this.logger.log(
        `Revoked ${revokedIds.length} session(s) for ${params.userType}#${params.userId}`,
      );
    }

    return revokedIds.length;
  }
}
