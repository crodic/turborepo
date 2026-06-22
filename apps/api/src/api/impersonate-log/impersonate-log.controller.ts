import { AutoIncrementID } from '@/common/types/common.type';
import { ApiAuth } from '@/decorators/http.decorators';
import { CheckPolicies } from '@/decorators/policies.decorator';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { AppAbility } from '@/libs/casl/ability.factory';
import { AppActions, AppSubjects } from '@/utils/permissions.constant';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import {
  FilterOperator,
  Paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { ImpersonateLogHistoryResDto } from './dto/impersonate-log-history.res.dto';
import { ImpersonateLogResDto } from './dto/impersonate-log.res.dto';
import { ImpersonateLogService } from './impersonate-log.service';

@ApiTags('Impersonate Logs')
@Controller({ path: 'impersonate-logs', version: '1' })
@UseGuards(AdminAuthGuard, PoliciesGuard)
export class ImpersonateLogController {
  constructor(private readonly impersonateLogService: ImpersonateLogService) {}

  @Get()
  @ApiAuth({
    type: ImpersonateLogHistoryResDto,
    statusCode: 200,
    summary: 'Get paginated impersonation histories',
    isPaginated: true,
    paginateOptions: {
      sortableColumns: ['id', 'startedAt', 'stoppedAt', 'createdAt', 'status'],
      defaultSortBy: [['startedAt', 'DESC']],
      filterableColumns: {
        sessionId: [FilterOperator.EQ],
        adminId: [FilterOperator.EQ],
        targetUserId: [FilterOperator.EQ],
        reason: [FilterOperator.ILIKE],
        status: [FilterOperator.EQ],
        startedAt: [FilterOperator.GTE, FilterOperator.LTE],
        stoppedAt: [FilterOperator.GTE, FilterOperator.LTE],
      },
    },
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.ImpersonateLog),
  )
  findAll(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<ImpersonateLogHistoryResDto>> {
    return this.impersonateLogService.findAllHistories(query);
  }

  @Get(':id')
  @ApiAuth({
    type: ImpersonateLogHistoryResDto,
    summary: 'Find impersonation history by id',
  })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.ImpersonateLog),
  )
  findOne(
    @Param('id') id: AutoIncrementID,
  ): Promise<ImpersonateLogHistoryResDto> {
    return this.impersonateLogService.findHistory(id);
  }

  @Get(':id/items')
  @ApiAuth({
    type: ImpersonateLogResDto,
    summary: 'Get paginated impersonation log items',
    isPaginated: true,
    paginateOptions: {
      sortableColumns: ['id', 'createdAt', 'action', 'method', 'status'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        action: [FilterOperator.IN],
        status: [FilterOperator.EQ],
        entityType: [FilterOperator.IN],
        entityId: [FilterOperator.IN],
        method: [FilterOperator.IN],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE],
      },
    },
  })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.ImpersonateLog),
  )
  findItems(
    @Param('id') id: AutoIncrementID,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<ImpersonateLogResDto>> {
    return this.impersonateLogService.findItems(id, query);
  }
}
