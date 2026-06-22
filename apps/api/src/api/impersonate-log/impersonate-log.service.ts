import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { IUserImpersonationEndedEmailJob } from '@/common/interfaces/job.interface';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import {
  EImpersonateHistoryStatus,
  EImpersonateLogStatus,
  ESessionUserType,
} from '@/constants/entity.enum';
import { JobName, QueueName } from '@/constants/job.constant';
import { createCacheKey } from '@/utils/cache.util';
import { InjectQueue } from '@nestjs/bullmq';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import ms, { StringValue } from 'ms';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { In, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { ImpersonateLogHistoryResDto } from './dto/impersonate-log-history.res.dto';
import { ImpersonateLogResDto } from './dto/impersonate-log.res.dto';
import { ImpersonateLogHistoryEntity } from './entities/impersonate-log-history.entity';
import { ImpersonateLogEntity } from './entities/impersonate-log.entity';
import {
  normalizeChangedFields,
  sanitizePayload,
} from './impersonate-log.util';

type ImpersonateContext = {
  historyId?: AutoIncrementID | string;
  sessionId: AutoIncrementID | string;
  adminId: AutoIncrementID | string;
  targetUserId: AutoIncrementID | string;
};

type RequestAuditContext = {
  method: string;
  endpoint: string;
  ipAddress?: string;
  userAgent?: string | string[];
  input?: unknown;
};

type CreateHistoryPayload = ImpersonateContext &
  Pick<RequestAuditContext, 'ipAddress' | 'userAgent'> & {
    reason: string;
    startedAt?: Date;
    expiresAt?: Date;
  };

type StopHistoryPayload = Pick<
  ImpersonateContext,
  'sessionId' | 'adminId' | 'targetUserId'
> &
  Pick<RequestAuditContext, 'ipAddress' | 'userAgent'> & {
    stoppedAt?: Date;
  };

type SuccessLogPayload = ImpersonateContext &
  RequestAuditContext & {
    action: string;
    entityType?: string;
    entityId?: string;
    output?: unknown;
    before?: unknown;
    after?: unknown;
    changedFields?: unknown;
  };

type FailedLogPayload = ImpersonateContext &
  RequestAuditContext & {
    action?: string;
    entityType?: string;
    entityId?: string;
    error: unknown;
  };

export type ImpersonationActionSummary = {
  label: string;
  status: string;
  createdAt?: string;
};

@Injectable()
export class ImpersonateLogService {
  private readonly logger = new Logger(ImpersonateLogService.name);

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    @InjectRepository(ImpersonateLogEntity)
    private readonly impersonateLogRepository: Repository<ImpersonateLogEntity>,
    @InjectRepository(ImpersonateLogHistoryEntity)
    private readonly historyRepository: Repository<ImpersonateLogHistoryEntity>,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async findAllHistories(
    query: PaginateQuery,
  ): Promise<Paginated<ImpersonateLogHistoryResDto>> {
    const qb = this.historyRepository.createQueryBuilder('history');

    const result = await paginate(query, qb, {
      sortableColumns: ['id', 'startedAt', 'stoppedAt', 'createdAt', 'status'],
      defaultSortBy: [['startedAt', 'DESC']],
      filterableColumns: {
        sessionId: [FilterOperator.EQ],
        adminId: [FilterOperator.EQ],
        targetUserId: [FilterOperator.EQ],
        reason: [FilterOperator.ILIKE],
        status: [FilterOperator.EQ, FilterOperator.IN],
        startedAt: [FilterOperator.GTE, FilterOperator.LTE],
        stoppedAt: [FilterOperator.GTE, FilterOperator.LTE],
      },
    });

    const [adminsById, targetUsersById, itemCountsByHistoryId] =
      await Promise.all([
        this.getAdminsById(result.data.map((history) => history.adminId)),
        this.getTargetUsersById(
          result.data.map((history) => history.targetUserId),
        ),
        this.getItemCountsByHistoryId(result.data.map((history) => history.id)),
      ]);

    return {
      ...result,
      data: plainToInstance(
        ImpersonateLogHistoryResDto,
        result.data.map((history) => ({
          ...history,
          admin: adminsById.get(String(history.adminId)) ?? null,
          targetUser: targetUsersById.get(String(history.targetUserId)) ?? null,
          itemsCount: itemCountsByHistoryId.get(String(history.id)) ?? 0,
        })),
        {
          excludeExtraneousValues: true,
        },
      ),
    } as Paginated<ImpersonateLogHistoryResDto>;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async stopExpiredImpersonationHistories(): Promise<void> {
    const now = new Date();
    const histories = await this.historyRepository.find({
      where: {
        status: EImpersonateHistoryStatus.ACTIVE,
        expiresAt: LessThanOrEqual(now),
      },
      order: { expiresAt: 'ASC' },
      take: 50,
    });

    if (!histories.length) {
      return;
    }

    for (const history of histories) {
      try {
        await this.stopExpiredHistory(history, now);
      } catch (error) {
        this.logger.warn(
          `Failed to stop expired impersonation history ${history.id}: ${error}`,
        );
      }
    }
  }

  async findHistory(id: AutoIncrementID): Promise<ImpersonateLogHistoryResDto> {
    const history = await this.historyRepository.findOneBy({ id });

    if (!history) {
      throw new NotFoundException('Impersonate log history not found');
    }

    const [admin, targetUser, itemsCount] = await Promise.all([
      this.adminUserRepository.findOne({
        where: { id: history.adminId },
        select: ['id', 'firstName', 'lastName', 'fullName', 'email'],
      }),
      this.userRepository.findOne({
        where: { id: history.targetUserId },
        select: ['id', 'firstName', 'lastName', 'fullName', 'email'],
      }),
      this.impersonateLogRepository.count({ where: { historyId: id } }),
    ]);

    return plainToInstance(
      ImpersonateLogHistoryResDto,
      { ...history, admin, targetUser, itemsCount },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async findItems(
    historyId: AutoIncrementID,
    query: PaginateQuery,
  ): Promise<Paginated<ImpersonateLogResDto>> {
    const historyExists = await this.historyRepository.existsBy({
      id: historyId,
    });

    if (!historyExists) {
      throw new NotFoundException('Impersonate log history not found');
    }

    const qb = this.impersonateLogRepository
      .createQueryBuilder('impersonateLog')
      .where('impersonateLog.history_id = :historyId', { historyId });

    const result = await paginate(query, qb, {
      sortableColumns: ['id', 'createdAt', 'action', 'method', 'status'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        action: [FilterOperator.IN, FilterOperator.ILIKE],
        status: [FilterOperator.EQ, FilterOperator.IN],
        endpoint: [FilterOperator.ILIKE],
        entityType: [FilterOperator.IN],
        entityId: [FilterOperator.IN],
        method: [FilterOperator.IN],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE],
      },
    });

    return {
      ...result,
      data: plainToInstance(ImpersonateLogResDto, result.data, {
        excludeExtraneousValues: true,
      }),
    } as Paginated<ImpersonateLogResDto>;
  }

  async createHistory(payload: CreateHistoryPayload) {
    return this.historyRepository.save(
      this.historyRepository.create({
        sessionId: payload.sessionId as AutoIncrementID,
        adminId: payload.adminId as AutoIncrementID,
        targetUserId: payload.targetUserId as AutoIncrementID,
        reason: payload.reason,
        status: EImpersonateHistoryStatus.ACTIVE,
        startedAt: payload.startedAt ?? new Date(),
        expiresAt: payload.expiresAt,
        ipAddress: payload.ipAddress,
        userAgent: normalizeUserAgent(payload.userAgent),
      }),
    );
  }

  async assertAdminCanStartImpersonation(adminId: AutoIncrementID | string) {
    const activeHistory = await this.historyRepository.findOne({
      where: {
        adminId: adminId as AutoIncrementID,
        status: EImpersonateHistoryStatus.ACTIVE,
      },
      order: { startedAt: 'DESC' },
    });

    if (!activeHistory) {
      return;
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: activeHistory.targetUserId },
      select: ['id', 'firstName', 'lastName', 'fullName', 'email'],
    });

    throw new ConflictException({
      message:
        'This admin already has an active impersonation session. Stop the current impersonation before starting another one.',
      activeImpersonation: {
        historyId: activeHistory.id,
        sessionId: activeHistory.sessionId,
        targetUserId: activeHistory.targetUserId,
        targetUser,
        startedAt: activeHistory.startedAt,
      },
    });
  }

  async findActiveHistoryByAdminAndTarget(
    adminId: AutoIncrementID | string,
    targetUserId: AutoIncrementID | string,
  ) {
    return this.historyRepository.findOne({
      where: {
        adminId: adminId as AutoIncrementID,
        targetUserId: targetUserId as AutoIncrementID,
        status: EImpersonateHistoryStatus.ACTIVE,
      },
      order: { startedAt: 'DESC' },
    });
  }

  async getActionSummariesByHistoryId(
    historyId: AutoIncrementID | string | undefined,
  ): Promise<ImpersonationActionSummary[]> {
    if (!historyId) {
      return [];
    }

    const logs = await this.impersonateLogRepository.find({
      where: { historyId: historyId as AutoIncrementID },
      order: { createdAt: 'ASC' },
      take: 20,
    });

    return logs.map((log) => ({
      label: this.buildFriendlyActionLabel(log),
      status:
        log.status === EImpersonateLogStatus.SUCCESS
          ? 'Completed'
          : `Failed${log.errorMessage ? `: ${log.errorMessage}` : ''}`,
      createdAt: log.createdAt?.toISOString(),
    }));
  }

  async stopHistory(payload: StopHistoryPayload) {
    const stoppedAt = payload.stoppedAt ?? new Date();
    const history = await this.historyRepository.findOneBy({
      sessionId: payload.sessionId as AutoIncrementID,
      adminId: payload.adminId as AutoIncrementID,
      targetUserId: payload.targetUserId as AutoIncrementID,
    });

    if (!history) {
      return null;
    }

    history.status = EImpersonateHistoryStatus.STOPPED;
    history.stoppedAt = stoppedAt;
    history.ipAddress = payload.ipAddress ?? history.ipAddress;
    history.userAgent =
      normalizeUserAgent(payload.userAgent) ?? history.userAgent;

    return this.historyRepository.save(history);
  }

  private async stopExpiredHistory(
    history: ImpersonateLogHistoryEntity,
    stoppedAt: Date,
  ) {
    const freshHistory = await this.historyRepository.findOneBy({
      id: history.id,
      status: EImpersonateHistoryStatus.ACTIVE,
    });

    if (!freshHistory) {
      return;
    }

    const session = await this.sessionRepository.findOneBy({
      id: freshHistory.sessionId,
    });

    if (session && !session.revokedAt) {
      await this.sessionRepository.update(
        {
          id: session.id,
          userId: freshHistory.targetUserId,
          userType: ESessionUserType.USER,
          impersonatedBy: freshHistory.adminId,
          revokedAt: IsNull(),
        },
        { revokedAt: stoppedAt },
      );
      await this.blacklistSession(session.id);
    }

    freshHistory.status = EImpersonateHistoryStatus.STOPPED;
    freshHistory.stoppedAt = stoppedAt;
    await this.historyRepository.save(freshHistory);
    await this.queueImpersonationEndedEmail(freshHistory, stoppedAt);
  }

  async createSuccessLog(payload: SuccessLogPayload) {
    const historyId = await this.resolveHistoryId(payload);

    return this.impersonateLogRepository.save(
      this.impersonateLogRepository.create({
        historyId,
        sessionId: payload.sessionId as AutoIncrementID,
        adminId: payload.adminId as AutoIncrementID,
        targetUserId: payload.targetUserId as AutoIncrementID,
        action: payload.action,
        method: payload.method.toUpperCase(),
        endpoint: payload.endpoint,
        entityType: payload.entityType,
        entityId: payload.entityId,
        input: sanitizePayload(payload.input),
        output: sanitizePayload(payload.output ?? payload.after),
        before: sanitizePayload(payload.before),
        after: sanitizePayload(payload.after),
        changedFields: normalizeChangedFields(
          payload.changedFields,
          payload.before,
          payload.after,
        ),
        status: EImpersonateLogStatus.SUCCESS,
        errorMessage: null,
        ipAddress: payload.ipAddress,
        userAgent: normalizeUserAgent(payload.userAgent),
      }),
    );
  }

  async createFailedLog(payload: FailedLogPayload) {
    const historyId = await this.resolveHistoryId(payload);

    return this.impersonateLogRepository.save(
      this.impersonateLogRepository.create({
        historyId,
        sessionId: payload.sessionId as AutoIncrementID,
        adminId: payload.adminId as AutoIncrementID,
        targetUserId: payload.targetUserId as AutoIncrementID,
        action: payload.action ?? 'REQUEST_FAILED',
        method: payload.method.toUpperCase(),
        endpoint: payload.endpoint,
        entityType: payload.entityType,
        entityId: payload.entityId,
        input: sanitizePayload(payload.input),
        output: null,
        before: null,
        after: null,
        changedFields: [],
        status: EImpersonateLogStatus.FAILED,
        errorMessage: getFriendlyErrorMessage(payload.error),
        ipAddress: payload.ipAddress,
        userAgent: normalizeUserAgent(payload.userAgent),
      }),
    );
  }

  private async resolveHistoryId(payload: ImpersonateContext) {
    if (payload.historyId) {
      return payload.historyId as AutoIncrementID;
    }

    const history = await this.historyRepository.findOne({
      where: { sessionId: payload.sessionId as AutoIncrementID },
      select: ['id'],
    });

    return history?.id;
  }

  private buildFriendlyActionLabel(log: ImpersonateLogEntity): string {
    const entity = splitPascalCase(log.entityType || 'record');
    const action = String(log.action || '').toUpperCase();

    switch (action) {
      case 'INSERT':
        return `Created ${entity}${log.entityId ? ` #${log.entityId}` : ''}`;
      case 'UPDATE':
        return `Updated ${entity}${log.entityId ? ` #${log.entityId}` : ''}`;
      case 'DELETE':
        return `Deleted ${entity}${log.entityId ? ` #${log.entityId}` : ''}`;
      case 'SOFT_DELETE':
        return `Archived ${entity}${log.entityId ? ` #${log.entityId}` : ''}`;
      case 'RESTORE':
        return `Restored ${entity}${log.entityId ? ` #${log.entityId}` : ''}`;
      case 'REQUEST_FAILED':
        return `Tried to use ${log.method} ${log.endpoint || 'an endpoint'}`;
      default:
        return `${titleCase(action || log.method || 'Updated')} ${entity}${
          log.entityId ? ` #${log.entityId}` : ''
        }`;
    }
  }

  private async blacklistSession(sessionId: AutoIncrementID | string) {
    const refreshExpires = this.configService.getOrThrow(
      'auth.userRefreshExpires',
      {
        infer: true,
      },
    );

    await this.cacheManager.set<boolean>(
      createCacheKey(CacheKey.SESSION_BLACKLIST, sessionId),
      true,
      ms(refreshExpires as StringValue),
    );
  }

  private async queueImpersonationEndedEmail(
    history: ImpersonateLogHistoryEntity,
    endedAt: Date,
  ) {
    const [user, admin, actions] = await Promise.all([
      this.userRepository.findOne({
        where: { id: history.targetUserId },
        select: ['id', 'fullName', 'email'],
      }),
      this.adminUserRepository.findOne({
        where: { id: history.adminId },
        select: ['id', 'fullName', 'email'],
      }),
      this.getActionSummariesByHistoryId(history.id),
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
        startedAt: history.startedAt?.toISOString(),
        endedAt: endedAt.toISOString(),
        actions,
      } as IUserImpersonationEndedEmailJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );
  }

  private async getAdminsById(ids: AutoIncrementID[]) {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    const admins = uniqueIds.length
      ? await this.adminUserRepository.find({
          where: { id: In(uniqueIds) },
          select: ['id', 'firstName', 'lastName', 'fullName', 'email'],
        })
      : [];

    return new Map(admins.map((admin) => [String(admin.id), admin] as const));
  }

  private async getTargetUsersById(ids: AutoIncrementID[]) {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    const targetUsers = uniqueIds.length
      ? await this.userRepository.find({
          where: { id: In(uniqueIds) },
          select: ['id', 'firstName', 'lastName', 'fullName', 'email'],
        })
      : [];

    return new Map(targetUsers.map((user) => [String(user.id), user] as const));
  }

  private async getItemCountsByHistoryId(ids: AutoIncrementID[]) {
    const uniqueIds = [...new Set(ids.filter(Boolean))];

    if (!uniqueIds.length) {
      return new Map<string, number>();
    }

    const counts = await this.impersonateLogRepository
      .createQueryBuilder('item')
      .select('item.history_id', 'historyId')
      .addSelect('COUNT(item.id)', 'count')
      .where('item.history_id IN (:...ids)', { ids: uniqueIds })
      .groupBy('item.history_id')
      .getRawMany<{ historyId: string; count: string }>();

    return new Map(
      counts.map((row) => [String(row.historyId), Number(row.count)] as const),
    );
  }
}

function normalizeUserAgent(userAgent?: string | string[]) {
  return Array.isArray(userAgent) ? userAgent.join(', ') : userAgent;
}

function getFriendlyErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return 'Request failed';
}

function splitPascalCase(value: string) {
  return value
    .replace(/Entity$/u, '')
    .replace(/([a-z0-9])([A-Z])/gu, '$1 $2')
    .toLowerCase();
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/_/gu, ' ')
    .replace(/\b\w/gu, (char) => char.toUpperCase());
}
