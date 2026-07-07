import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { LoginResDto } from '@/api/auth/dto/users/login.res.dto';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import { AuthSessionService } from '@/api/auth/services/auth-session.service';
import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { UserEntity } from '@/api/user/entities/user.entity';
import {
  IEmailJob,
  IUserImpersonationEndedEmailJob,
  IUserImpersonationStartedEmailJob,
} from '@/common/interfaces/job.interface';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { ESessionUserType } from '@/constants/entity.enum';
import { JobName, QueueName } from '@/constants/job.constant';
import { createCacheKey } from '@/utils/cache.util';
import { InjectQueue } from '@nestjs/bullmq';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import crypto from 'crypto';
import ms, { StringValue } from 'ms';
import { IsNull, Repository } from 'typeorm';
import { SessionResDto } from '../auth/dto/session.res.dto';
import { ImpersonateUserReqDto } from './dto/impersonate-user.req.dto';
import { ImpersonateUserResDto } from './dto/impersonate-user.res.dto';
import { ImpersonationExchangeReqDto } from './dto/impersonation-exchange.req.dto';
import { ImpersonateLogService } from './impersonate-log.service';

type SessionRequestInfo = {
  ipAddress?: string;
  userAgent?: string | string[];
  method?: string;
  endpoint?: string;
};

@Injectable()
export class ImpersonationService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue<IEmailJob, any, string>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly authSessionService: AuthSessionService,
    private readonly impersonateLogService: ImpersonateLogService,
  ) {}

  async findActiveUserImpersonationSession(
    adminToken: JwtPayloadType,
    userId: AutoIncrementID,
  ): Promise<SessionResDto | null> {
    const activeHistory =
      await this.impersonateLogService.findActiveHistoryByAdminAndTarget(
        adminToken.id,
        userId,
      );

    if (!activeHistory) {
      return null;
    }

    const session = await this.sessionRepository.findOneBy({
      id: activeHistory.sessionId,
    });

    return plainToInstance(
      SessionResDto,
      {
        ...(session ?? {
          id: activeHistory.sessionId,
          userId,
          userType: ESessionUserType.USER,
          impersonatedBy: adminToken.id,
          expiresAt: activeHistory.expiresAt,
          createdAt: activeHistory.startedAt,
        }),
        isCurrent: false,
      },
      { excludeExtraneousValues: true },
    );
  }

  async stopUserImpersonation(
    adminToken: JwtPayloadType,
    userId: AutoIncrementID,
    requestInfo?: SessionRequestInfo,
  ): Promise<{ message: string }> {
    const activeHistory =
      await this.impersonateLogService.findActiveHistoryByAdminAndTarget(
        adminToken.id,
        userId,
      );

    if (!activeHistory) {
      throw new NotFoundException('Active impersonation session not found');
    }

    const revokedAt = new Date();
    const session = await this.sessionRepository.findOneBy({
      id: activeHistory.sessionId,
    });

    if (session && !session.revokedAt) {
      await this.authSessionService.revokeSession({
        sessionId: session.id,
        userId,
        userType: ESessionUserType.USER,
        impersonatedBy: adminToken.id,
        revokedAt,
      });
    }

    await this.impersonateLogService.stopHistory({
      sessionId: activeHistory.sessionId,
      adminId: adminToken.id,
      targetUserId: userId,
      stoppedAt: revokedAt,
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });
    await this.queueImpersonationEndedEmail({
      userId,
      adminId: adminToken.id,
      startedAt: activeHistory.startedAt,
      endedAt: revokedAt,
      historyId: activeHistory.id,
    });

    return { message: 'Stopped impersonating successfully' };
  }

  async impersonateUser(
    adminToken: JwtPayloadType,
    dto: ImpersonateUserReqDto,
    requestInfo?: SessionRequestInfo,
  ): Promise<ImpersonateUserResDto> {
    const user = await this.userRepository.findOneBy({ id: dto.userId as any });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.impersonateLogService.assertAdminCanStartImpersonation(
      adminToken.id,
    );

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');
    const expiresIn = this.configService.getOrThrow(
      'auth.impersonationSessionExpires',
      { infer: true },
    ) as StringValue;
    const expiresAt = new Date(Date.now() + ms(expiresIn));
    const session = await this.sessionRepository.save(
      this.sessionRepository.create({
        hash,
        userId: user.id,
        userType: ESessionUserType.USER,
        impersonatedBy: adminToken.id as AutoIncrementID,
        ipAddress: requestInfo?.ipAddress,
        userAgent: normalizeUserAgent(requestInfo?.userAgent),
        expiresAt,
      }),
    );
    await this.authSessionService.clearSessionBlacklist(session.id);

    const history = await this.impersonateLogService.createHistory({
      sessionId: session.id,
      adminId: adminToken.id,
      targetUserId: user.id,
      reason: dto.reason,
      startedAt: session.createdAt ?? new Date(),
      expiresAt,
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });
    await this.queueImpersonationStartedEmail({
      user,
      adminId: adminToken.id,
      reason: dto.reason,
      startedAt: history.startedAt,
      expiresAt,
    });

    const tokenExpiresIn = this.configService.getOrThrow('auth.userExpires', {
      infer: true,
    });
    const tokenExpires = Date.now() + ms(tokenExpiresIn as StringValue);
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          id: user.id,
          sessionId: session.id,
          hash,
          impersonationHistoryId: history.id,
        },
        {
          secret: this.configService.getOrThrow('auth.userSecret', {
            infer: true,
          }),
          expiresIn: tokenExpiresIn as StringValue,
        },
      ),
      this.jwtService.signAsync(
        {
          sessionId: session.id,
          hash,
        },
        {
          secret: this.configService.getOrThrow('auth.userRefreshSecret', {
            infer: true,
          }),
          expiresIn,
        },
      ),
    ]);

    const exchangeToken = crypto.randomUUID();
    await this.cacheManager.set<LoginResDto>(
      createCacheKey(CacheKey.IMPERSONATION_EXCHANGE, exchangeToken),
      plainToInstance(LoginResDto, {
        userId: user.id,
        accessToken,
        refreshToken,
        tokenExpires,
      }),
      ms('5m'),
    );

    const redirectUrl = dto.callbackUrl
      ? this.buildRedirectUrl(dto.callbackUrl, { token: exchangeToken })
      : undefined;

    return plainToInstance(
      ImpersonateUserResDto,
      {
        userId: user.id,
        impersonatedBy: adminToken.id,
        session,
        accessToken,
        refreshToken,
        tokenExpires,
        expiresAt,
        callbackUrl: dto.callbackUrl,
        redirectUrl,
      },
      { excludeExtraneousValues: true },
    );
  }

  async stopImpersonating(
    userToken: JwtPayloadType,
    requestInfo?: SessionRequestInfo,
  ): Promise<{ message: string }> {
    const session = await this.sessionRepository.findOneBy({
      id: userToken.sessionId as AutoIncrementID,
      userId: userToken.id as AutoIncrementID,
      userType: ESessionUserType.USER,
      revokedAt: IsNull(),
    });

    if (!session?.impersonatedBy) {
      throw new BadRequestException('Current session is not impersonated');
    }

    const revokedAt = new Date();
    const result = await this.authSessionService.revokeSession({
      sessionId: userToken.sessionId,
      userId: userToken.id,
      userType: ESessionUserType.USER,
      revokedAt,
    });

    if (result.affected === 0) {
      throw new BadRequestException('Current session is not impersonated');
    }

    await this.impersonateLogService.stopHistory({
      sessionId: session.id,
      adminId: session.impersonatedBy,
      targetUserId: session.userId,
      stoppedAt: revokedAt,
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });
    await this.queueImpersonationEndedEmail({
      userId: session.userId,
      adminId: session.impersonatedBy,
      historyId: userToken.impersonationHistoryId,
      startedAt: session.createdAt,
      endedAt: revokedAt,
    });

    return { message: 'Stopped impersonating successfully' };
  }

  async exchangeImpersonationLogin(
    dto: ImpersonationExchangeReqDto,
  ): Promise<LoginResDto> {
    const cacheKey = createCacheKey(CacheKey.IMPERSONATION_EXCHANGE, dto.token);
    const cached = await this.cacheManager.get<LoginResDto>(cacheKey);

    if (!cached) {
      throw new UnauthorizedException();
    }

    await this.cacheManager.del(cacheKey);

    return plainToInstance(LoginResDto, cached);
  }

  private async queueImpersonationStartedEmail(params: {
    user: UserEntity;
    adminId: AutoIncrementID | string;
    reason?: string;
    startedAt: Date;
    expiresAt?: Date;
  }) {
    const admin = await this.adminUserRepository.findOne({
      where: { id: params.adminId as AutoIncrementID },
      select: ['id', 'fullName', 'email'],
    });

    await this.emailQueue.add(
      JobName.USER_IMPERSONATION_STARTED,
      {
        email: params.user.email,
        userName: params.user.fullName || params.user.email,
        adminName: admin?.fullName || admin?.email,
        reason: params.reason,
        startedAt: params.startedAt.toISOString(),
        expiresAt: params.expiresAt?.toISOString(),
      } as IUserImpersonationStartedEmailJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );
  }

  private async queueImpersonationEndedEmail(params: {
    userId: AutoIncrementID | string;
    adminId: AutoIncrementID | string;
    historyId?: AutoIncrementID | string;
    startedAt?: Date;
    endedAt: Date;
  }) {
    const [user, admin, actions] = await Promise.all([
      this.userRepository.findOne({
        where: { id: params.userId as AutoIncrementID },
        select: ['id', 'fullName', 'email'],
      }),
      this.adminUserRepository.findOne({
        where: { id: params.adminId as AutoIncrementID },
        select: ['id', 'fullName', 'email'],
      }),
      this.impersonateLogService.getActionSummariesByHistoryId(
        params.historyId,
      ),
    ]);

    if (!user) {
      return;
    }

    await this.emailQueue.add(
      JobName.USER_IMPERSONATION_ENDED,
      {
        email: user.email,
        userName: user.fullName || user.email,
        adminName: admin?.fullName || admin?.email,
        startedAt: params.startedAt?.toISOString(),
        endedAt: params.endedAt.toISOString(),
        actions,
      } as IUserImpersonationEndedEmailJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );
  }

  private buildRedirectUrl(url: string, query: Record<string, string>) {
    const redirectUrl = new URL(url);

    Object.entries(query).forEach(([key, value]) => {
      redirectUrl.searchParams.set(key, value);
    });

    return redirectUrl.toString();
  }
}

function normalizeUserAgent(userAgent?: string | string[]) {
  return Array.isArray(userAgent) ? userAgent.join(', ') : userAgent;
}
