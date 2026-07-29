import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { LessThan, Repository } from 'typeorm';
import { RequestLogEntity } from './entities/request-log.entity';

@Injectable()
export class RequestLogService {
  private readonly logger = new Logger(RequestLogService.name);

  constructor(
    @InjectRepository(RequestLogEntity)
    private readonly requestLogRepository: Repository<RequestLogEntity>,
  ) {}

  async findAll(query: PaginateQuery): Promise<Paginated<RequestLogEntity>> {
    const queryBuilder = this.requestLogRepository.createQueryBuilder('log');

    return paginate(query, queryBuilder, {
      sortableColumns: ['timestamp', 'duration', 'status', 'method'],
      searchableColumns: ['method', 'path', 'ip', 'browser', 'os', 'device'],
      defaultSortBy: [['timestamp', 'DESC']],
      filterableColumns: {
        method: [FilterOperator.EQ, FilterOperator.ILIKE],
        status: [FilterOperator.EQ, FilterOperator.GTE, FilterOperator.LTE],
        path: [FilterOperator.ILIKE],
      },
    });
  }

  async getMapLogs(): Promise<RequestLogEntity[]> {
    return this.requestLogRepository
      .createQueryBuilder('log')
      .where('log.latitude IS NOT NULL')
      .andWhere('log.longitude IS NOT NULL')
      .orderBy('log.timestamp', 'DESC')
      .take(500)
      .getMany();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleLogCleanup() {
    this.logger.log('Starting request log cleanup...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      const result = await this.requestLogRepository.delete({
        timestamp: LessThan(sevenDaysAgo),
      });
      this.logger.log(
        `Cleanup finished. Deleted ${result.affected ?? 0} old request logs.`,
      );
    } catch (error) {
      this.logger.error('Failed to clean up request logs', error);
    }
  }
}
