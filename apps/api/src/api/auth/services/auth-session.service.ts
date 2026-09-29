import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { LOGIN_ACTIVITY_DAYS } from '@/constants/app.constant';
import { CacheKey } from '@/constants/cache.constant';
import { ESessionUserType } from '@/constants/entity.enum';
import { createCacheKey } from '@/utils/cache.util';
import { normalizeUserAgent } from '@/utils/normalize.util';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import ms, { StringValue } from 'ms';
import { IsNull, Not, Repository } from 'typeorm';
import { LoginActivityResDto } from '../dto/admin-users/login-activity.res.dto';
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

  /**
   * Builds a map of YYYY-MM-DD date strings initialized to 0 for the past N days.
   */
  private buildDateRangeMap(days: number): {
    startDate: Date;
    datesMap: Map<string, number>;
  } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const datesMap = new Map<string, number>();
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      datesMap.set(dateStr, 0);
    }

    return { startDate, datesMap };
  }

  /**
   * Queries aggregated daily session counts for a given user from the database.
   */
  private async querySessionCounts(
    userId: AutoIncrementID | string,
    userType: ESessionUserType,
    startDate: Date,
  ): Promise<Array<{ date: string; count: string }>> {
    return this.sessionRepository
      .createQueryBuilder('session')
      .select(
        "TO_CHAR(session.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')",
        'date',
      )
      .addSelect('COUNT(session.id)', 'count')
      .where('session.userId = :userId', { userId })
      .andWhere('session.userType = :userType', { userType })
      .andWhere('session.createdAt >= :startDate', { startDate })
      .groupBy("TO_CHAR(session.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')")
      .getRawMany();
  }

  /**
   * Computes an activity heatmap level (0-4) based on session count.
   */
  private calculateActivityLevel(count: number): number {
    if (count <= 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 5) return 3;
    return 4;
  }

  /**
   * Computes login activity heatmap data for the past 180 days.
   */
  async getLoginActivity(
    userToken: JwtPayloadType,
    userType: ESessionUserType,
  ): Promise<LoginActivityResDto> {
    try {
      const { startDate, datesMap } =
        this.buildDateRangeMap(LOGIN_ACTIVITY_DAYS);
      const rawSessions = await this.querySessionCounts(
        userToken.id,
        userType,
        startDate,
      );

      let totalSessions = 0;
      let activeDays = 0;

      for (const session of rawSessions) {
        if (datesMap.has(session.date)) {
          const count = parseInt(session.count, 10);
          datesMap.set(session.date, count);
          totalSessions += count;
          if (count > 0) activeDays++;
        }
      }

      const data = Array.from(datesMap.entries()).map(([date, count]) => ({
        date,
        count,
        level: this.calculateActivityLevel(count),
      }));

      return plainToInstance(LoginActivityResDto, {
        totalSessions,
        activeDays,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get login activity: ${message}`, stack);
      throw new BadRequestException('Failed to retrieve login activity');
    }
  }
}
