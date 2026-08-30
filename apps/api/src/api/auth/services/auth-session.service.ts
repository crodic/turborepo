import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { ESessionUserType } from '@/constants/entity.enum';
import { createCacheKey } from '@/utils/cache.util';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
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
    return { message: 'Xóa phiên đăng nhập thành công' };
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

    return { message: 'Xóa tất cả phiên đăng nhập thành công' };
  }

  async getLoginActivity(
    userToken: JwtPayloadType,
    userType: ESessionUserType,
  ): Promise<LoginActivityResDto> {
    try {
      const days = 180;
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

      const sessions = await this.sessionRepository
        .createQueryBuilder('session')
        .select(
          "TO_CHAR(session.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')",
          'date',
        )
        .addSelect('COUNT(session.id)', 'count')
        .where('session.userId = :userId', { userId: userToken.id })
        .andWhere('session.userType = :userType', { userType })
        .andWhere('session.createdAt >= :startDate', { startDate })
        .groupBy("TO_CHAR(session.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')")
        .getRawMany();

      let totalSessions = 0;
      let activeDays = 0;

      for (const session of sessions) {
        if (datesMap.has(session.date)) {
          const count = parseInt(session.count, 10);
          datesMap.set(session.date, count);
          totalSessions += count;
          if (count > 0) activeDays++;
        }
      }

      const data = Array.from(datesMap.entries()).map(([date, count]) => {
        let level = 0;
        if (count === 1) level = 1;
        else if (count >= 2 && count <= 3) level = 2;
        else if (count >= 4 && count <= 5) level = 3;
        else if (count >= 6) level = 4;
        return { date, count, level };
      });

      return plainToInstance(LoginActivityResDto, {
        totalSessions,
        activeDays,
        data,
      });
    } catch (e: any) {
      console.error(e);
      throw new BadRequestException(e.message);
    }
  }
}
