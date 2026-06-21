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
import { ImpersonateLogResDto } from './dto/impersonate-log.res.dto';
import { ImpersonateLogService } from './impersonate-log.service';

@ApiTags('Impersonate Logs')
@Controller({ path: 'impersonate-logs', version: '1' })
@UseGuards(AdminAuthGuard, PoliciesGuard)
export class ImpersonateLogController {
  constructor(private readonly impersonateLogService: ImpersonateLogService) {}

  @Get()
  @ApiAuth({
    type: ImpersonateLogResDto,
    statusCode: 200,
    summary: 'Get paginated impersonation logs',
    isPaginated: true,
    paginateOptions: {
      sortableColumns: ['id', 'createdAt', 'action', 'method', 'status'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        sessionId: [FilterOperator.EQ],
        adminId: [FilterOperator.EQ],
        targetUserId: [FilterOperator.EQ],
        action: [FilterOperator.IN],
        status: [FilterOperator.EQ],
        entityType: [FilterOperator.IN],
        entityId: [FilterOperator.IN],
        method: [FilterOperator.IN],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE],
      },
    },
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.ImpersonateLog),
  )
  findAll(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<ImpersonateLogResDto>> {
    return this.impersonateLogService.findAll(query);
  }

  @Get(':id')
  @ApiAuth({
    type: ImpersonateLogResDto,
    summary: 'Find impersonation log by id',
  })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.ImpersonateLog),
  )
  findOne(@Param('id') id: AutoIncrementID): Promise<ImpersonateLogResDto> {
    return this.impersonateLogService.findOne(id);
  }
}
