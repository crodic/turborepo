import { AutoIncrementID } from '@/common/types/common.type';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { EmailLogResDto } from './dto/email-log.res.dto';
import { EmailLogEntity } from './entities/email-log.entity';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectRepository(EmailLogEntity)
    private readonly emailLogRepository: Repository<EmailLogEntity>,
  ) {}

  async findAll(
    query: PaginateQuery,
    filter: Partial<EmailLogEntity> = {},
  ): Promise<Paginated<EmailLogResDto>> {
    const qb = this.emailLogRepository
      .createQueryBuilder('emailLog')
      .leftJoinAndSelect('emailLog.createdByAdmin', 'createdByAdmin');

    if (filter.createdByAdminId) {
      qb.andWhere('emailLog.createdByAdminId = :createdByAdminId', {
        createdByAdminId: filter.createdByAdminId,
      });
    }

    if (query.filter?.to) {
      const toVal = query.filter.to as string;
      const search = toVal.startsWith('$ilike:') ? toVal.substring(7) : toVal;
      qb.andWhere('CAST(emailLog.to AS TEXT) ILIKE :toSearch', {
        toSearch: `%${search}%`,
      });
      delete query.filter.to;
    }

    const result = await paginate(query, qb, {
      sortableColumns: ['id', 'createdAt', 'scheduledAt', 'sentAt', 'status'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        status: [FilterOperator.IN],
        source: [FilterOperator.IN],
        subject: [FilterOperator.ILIKE],
        createdByAdminId: [FilterOperator.EQ],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE],
        scheduledAt: [FilterOperator.GTE, FilterOperator.LTE],
        sentAt: [FilterOperator.GTE, FilterOperator.LTE],
      },
    });

    return {
      ...result,
      data: plainToInstance(EmailLogResDto, result.data, {
        excludeExtraneousValues: true,
      }),
    } as Paginated<EmailLogResDto>;
  }

  async findOne(id: AutoIncrementID): Promise<EmailLogResDto> {
    const emailLog = await this.emailLogRepository.findOne({
      where: { id },
      relations: ['createdByAdmin'],
    });

    if (!emailLog) {
      throw new NotFoundException('Email log not found');
    }

    return plainToInstance(EmailLogResDto, emailLog, {
      excludeExtraneousValues: true,
    });
  }
}
