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
import { AuditLogService } from './audit-log.service';
import { AuditLogResDto } from './dto/audit-log.res.dto';

@ApiTags('Audit Logs')
@Controller({ path: 'audit-logs', version: '1' })
@UseGuards(AdminAuthGuard, PoliciesGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiAuth({
    type: AuditLogResDto,
    statusCode: 200,
    summary: 'Get paginated audit logs',
    isPaginated: true,
    paginateOptions: {
      sortableColumns: ['id', 'timestamp'],
      defaultSortBy: [['timestamp', 'DESC']],
      filterableColumns: {
        timestamp: [FilterOperator.GTE, FilterOperator.LTE],
        action: [FilterOperator.IN],
        entity: [FilterOperator.ILIKE],
        entityId: [FilterOperator.EQ],
        userId: [FilterOperator.EQ],
      },
    },
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Log),
  )
  findAll(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<AuditLogResDto>> {
    return this.auditLogService.findAll(query);
  }

  @Get(':id')
  @ApiAuth({ type: AuditLogResDto, summary: 'Find audit log by id' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Log),
  )
  async findOne(@Param('id') id: AutoIncrementID): Promise<AuditLogResDto> {
    return await this.auditLogService.findOne(id);
  }
}
