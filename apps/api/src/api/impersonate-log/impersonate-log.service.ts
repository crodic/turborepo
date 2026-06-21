import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { EImpersonateLogStatus } from '@/constants/entity.enum';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { ImpersonateLogResDto } from './dto/impersonate-log.res.dto';
import { ImpersonateLogEntity } from './entities/impersonate-log.entity';
import {
  normalizeChangedFields,
  sanitizePayload,
} from './impersonate-log.util';

type ImpersonateContext = {
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
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findAll(
    query: PaginateQuery,
  ): Promise<Paginated<ImpersonateLogResDto>> {
    const qb =
      this.impersonateLogRepository.createQueryBuilder('impersonateLog');

    const result = await paginate(query, qb, {
      sortableColumns: ['id', 'createdAt', 'action', 'method', 'status'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        sessionId: [FilterOperator.EQ],
        adminId: [FilterOperator.EQ],
        targetUserId: [FilterOperator.EQ],
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

  async findOne(id: AutoIncrementID): Promise<ImpersonateLogResDto> {
    const log = await this.impersonateLogRepository.findOneBy({ id });

    if (!log) {
      throw new NotFoundException('Impersonate log not found');
    }

    const [admin, targetUser] = await Promise.all([
      this.adminUserRepository.findOne({
        where: { id: log.adminId },
        select: ['id', 'firstName', 'lastName', 'email'],
      }),
      this.userRepository.findOne({
        where: { id: log.targetUserId },
        select: ['id', 'firstName', 'lastName', 'email'],
      }),
    ]);

    return plainToInstance(
      ImpersonateLogResDto,
      { ...log, admin, targetUser },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async createSuccessLog(payload: SuccessLogPayload) {
    return this.impersonateLogRepository.save(
      this.impersonateLogRepository.create({
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
    return this.impersonateLogRepository.save(
      this.impersonateLogRepository.create({
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
