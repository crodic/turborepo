import { AutoIncrementID } from '@/common/types/common.type';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { assert } from 'console';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { LessThan, Repository } from 'typeorm';
import { AuditLogResDto } from './dto/audit-log.res.dto';
import { AuditLogEntity } from './entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  async findAll(query: PaginateQuery): Promise<Paginated<AuditLogResDto>> {
    const qb = this.auditLogRepository.createQueryBuilder('log');

    const result = await paginate(query, qb, {
      sortableColumns: ['id', 'timestamp'],
      defaultSortBy: [['timestamp', 'DESC']],
      filterableColumns: {
        timestamp: [FilterOperator.GTE, FilterOperator.LTE],
        action: [FilterOperator.IN],
        entity: [FilterOperator.ILIKE],
        entityId: [FilterOperator.ILIKE],
        userId: [FilterOperator.EQ],
      },
    });

    return {
      ...result,
      data: plainToInstance(AuditLogResDto, result.data, {
        excludeExtraneousValues: true,
      }),
    } as Paginated<AuditLogResDto>;
  }

  async findOne(id: AutoIncrementID): Promise<AuditLogResDto> {
    assert(id, 'id is required');

    const auditLog = await this.auditLogRepository.findOneBy({ id });

    if (!auditLog) {
      throw new NotFoundException('Activity log not found');
    }

    return plainToInstance(AuditLogResDto, auditLog, {
      excludeExtraneousValues: true,
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async purgeAuditLogsOlderThan7Days() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.auditLogRepository.delete({ timestamp: LessThan(sevenDaysAgo) });
  }
}
