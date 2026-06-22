import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import {
  EImpersonateHistoryStatus,
  EImpersonateLogStatus,
} from '@/constants/entity.enum';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { In, Repository } from 'typeorm';
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

@Injectable()
export class ImpersonateLogService {
  constructor(
    @InjectRepository(ImpersonateLogEntity)
    private readonly impersonateLogRepository: Repository<ImpersonateLogEntity>,
    @InjectRepository(ImpersonateLogHistoryEntity)
    private readonly historyRepository: Repository<ImpersonateLogHistoryEntity>,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
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
