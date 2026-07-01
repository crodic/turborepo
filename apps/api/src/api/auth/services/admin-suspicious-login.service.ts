import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import {
  AdminSuspiciousLoginReason,
  IAdminSuspiciousLoginEmailJob,
  IEmailJob,
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
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import crypto from 'crypto';
import ms, { StringValue } from 'ms';
import { Repository } from 'typeorm';

export type SuspiciousLoginReason = AdminSuspiciousLoginReason;

export type SuspiciousLoginPayload = {
  id: string;
  purpose: 'admin-suspicious-login';
  challengeId: string;
  ipAddress?: string;
  userAgent?: string;
  reasons: SuspiciousLoginReason[];
};

export type SuspiciousLoginAssessment = {
  score: number;
  reasons: SuspiciousLoginReason[];
};

export type SuspiciousLoginRequestInfo = {
  ipAddress?: string;
  userAgent?: string | string[];
};

const SUSPICIOUS_LOGIN_TTL = '10m' as StringValue;
const FAILED_LOGIN_THRESHOLD = 5;
const FAILED_LOGIN_TTL = '15m' as StringValue;
const SUSPICIOUS_LOGIN_VERIFY_SCORE = 60;
const SUSPICIOUS_LOGIN_SCORE: Record<SuspiciousLoginReason, number> = {
  new_ip_address: 45,
  new_device: 15,
  failed_login_attempts: 70,
};

@Injectable()
export class AdminSuspiciousLoginService {
  private readonly logger = new Logger(AdminSuspiciousLoginService.name);

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue<IEmailJob, any, string>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  isEnabled(): boolean {
    return (
      this.configService.get('auth.suspiciousLoginEnabled', {
        infer: true,
      }) === true
    );
  }

  shouldRequireVerification(assessment: SuspiciousLoginAssessment): boolean {
    return assessment.score >= SUSPICIOUS_LOGIN_VERIFY_SCORE;
  }

  async assess(
    adminId: AutoIncrementID | string,
    requestInfo?: SuspiciousLoginRequestInfo,
    failedAttempts = 0,
  ): Promise<SuspiciousLoginAssessment> {
    if (!this.isEnabled()) {
      return { score: 0, reasons: [] };
    }

    const ipAddress = requestInfo?.ipAddress;
    const userAgent = normalizeUserAgent(requestInfo?.userAgent);
    const previousSessions = await this.sessionRepository.find({
      where: {
        userId: adminId as AutoIncrementID,
        userType: ESessionUserType.ADMIN,
      },
      select: ['id', 'ipAddress', 'userAgent'],
    });

    if (previousSessions.length === 0) {
      return this.addFailedAttemptsSignal(
        { score: 0, reasons: [] },
        failedAttempts,
      );
    }

    const assessment: SuspiciousLoginAssessment = { score: 0, reasons: [] };

    if (
      ipAddress &&
      !previousSessions.some((session) => session.ipAddress === ipAddress)
    ) {
      this.addReason(assessment, 'new_ip_address');
    }

    if (
      userAgent &&
      !previousSessions.some((session) => session.userAgent === userAgent)
    ) {
      this.addReason(assessment, 'new_device');
    }

    return this.addFailedAttemptsSignal(assessment, failedAttempts);
  }

  async recordFailedLogin(identifier: AutoIncrementID | string): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const cacheKey = createCacheKey(
      CacheKey.ADMIN_LOGIN_FAILED_ATTEMPTS,
      identifier,
    );
    const failedAttempts = (await this.cacheManager.get<number>(cacheKey)) ?? 0;

    await this.cacheManager.set(
      cacheKey,
      failedAttempts + 1,
      ms(FAILED_LOGIN_TTL),
    );
  }

  async getFailedLoginAttempts(
    identifier: AutoIncrementID | string,
  ): Promise<number> {
    if (!this.isEnabled()) {
      return 0;
    }

    return (
      (await this.cacheManager.get<number>(
        createCacheKey(CacheKey.ADMIN_LOGIN_FAILED_ATTEMPTS, identifier),
      )) ?? 0
    );
  }

  async clearFailedLoginAttempts(
    identifier: AutoIncrementID | string,
  ): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    await this.cacheManager.del(
      createCacheKey(CacheKey.ADMIN_LOGIN_FAILED_ATTEMPTS, identifier),
    );
  }

  async createChallenge(params: {
    user: AdminUserEntity;
    requestInfo?: SuspiciousLoginRequestInfo;
    reasons: SuspiciousLoginReason[];
  }): Promise<{
    token: string;
    methods: string[];
    reasons: SuspiciousLoginReason[];
  }> {
    const challengeId = crypto.randomUUID();
    const verificationCode = this.generateEmailVerificationCode();
    const userAgent = normalizeUserAgent(params.requestInfo?.userAgent);

    await this.cacheManager.set(
      createCacheKey(CacheKey.ADMIN_SUSPICIOUS_LOGIN_CODE, challengeId),
      this.hashVerificationCode(verificationCode),
      ms(SUSPICIOUS_LOGIN_TTL),
    );
    await this.queueEmail(
      params.user,
      {
        id: challengeId as AutoIncrementID,
        userId: params.user.id as AutoIncrementID,
        userType: ESessionUserType.ADMIN,
        hash: '',
        ipAddress: params.requestInfo?.ipAddress,
        userAgent,
        isSuspicious: true,
        suspiciousReasons: params.reasons,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SessionEntity,
      verificationCode,
    );

    return {
      token: await this.createToken({
        id: params.user.id,
        purpose: 'admin-suspicious-login',
        challengeId,
        ipAddress: params.requestInfo?.ipAddress,
        userAgent,
        reasons: params.reasons,
      }),
      methods: params.user.twoFactorEnabled
        ? ['email', 'totp', 'backup_code']
        : ['email'],
      reasons: params.reasons,
    };
  }

  verifyToken(token: string): SuspiciousLoginPayload {
    try {
      const payload = this.jwtService.verify<SuspiciousLoginPayload>(token, {
        secret: this.getSigningSecret(),
      });

      if (payload.purpose !== 'admin-suspicious-login') {
        throw new UnauthorizedException();
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Suspicious login verification expired');
    }
  }

  async verifyEmailCode(challengeId: string, code: string): Promise<boolean> {
    const codeHash = await this.cacheManager.get<string>(
      createCacheKey(CacheKey.ADMIN_SUSPICIOUS_LOGIN_CODE, challengeId),
    );

    if (!codeHash) {
      return false;
    }

    return this.hashVerificationCode(code) === codeHash;
  }

  async clearChallenge(challengeId: string): Promise<void> {
    await this.cacheManager.del(
      createCacheKey(CacheKey.ADMIN_SUSPICIOUS_LOGIN_CODE, challengeId),
    );
  }

  async queueEmail(
    user: AdminUserEntity,
    session: SessionEntity,
    verificationCode?: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Queueing suspicious login email for admin ${user.id} session ${session.id}`,
      );
      const job = await this.emailQueue.add(
        JobName.ADMIN_SUSPICIOUS_LOGIN,
        {
          email: user.email,
          loginAt: (session.createdAt ?? new Date()).toISOString(),
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          reasons: (session.suspiciousReasons ?? []) as SuspiciousLoginReason[],
          verificationCode,
        } as IAdminSuspiciousLoginEmailJob,
        { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
      );
      this.logger.log(
        `Queued suspicious login email job ${job?.id ?? 'unknown'} for admin ${user.id} session ${session.id}`,
      );
    } catch (error) {
      this.logger.warn(`Failed to queue suspicious login email: ${error}`);
    }
  }

  private addFailedAttemptsSignal(
    assessment: SuspiciousLoginAssessment,
    failedAttempts: number,
  ): SuspiciousLoginAssessment {
    if (failedAttempts >= FAILED_LOGIN_THRESHOLD) {
      this.addReason(assessment, 'failed_login_attempts');
    }

    return assessment;
  }

  private addReason(
    assessment: SuspiciousLoginAssessment,
    reason: SuspiciousLoginReason,
  ): void {
    if (assessment.reasons.includes(reason)) {
      return;
    }

    assessment.reasons.push(reason);
    assessment.score += SUSPICIOUS_LOGIN_SCORE[reason];
  }

  private async createToken(data: SuspiciousLoginPayload): Promise<string> {
    return this.jwtService.signAsync(data, {
      secret: this.getSigningSecret(),
      expiresIn: SUSPICIOUS_LOGIN_TTL,
    });
  }

  private generateEmailVerificationCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  private hashVerificationCode(code: string): string {
    return crypto
      .createHash('sha256')
      .update(code.trim().replace(/\s+/g, ''))
      .digest('hex');
  }

  private getSigningSecret(): string {
    return crypto
      .createHash('sha256')
      .update(
        `${this.configService.getOrThrow('auth.secret', { infer: true })}:admin-suspicious-login`,
      )
      .digest('hex');
  }
}

export function normalizeUserAgent(userAgent?: string | string[]) {
  return Array.isArray(userAgent) ? userAgent.join(', ') : userAgent;
}
