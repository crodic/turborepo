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
import { EmailLogResDto } from './dto/email-log.res.dto';
import { EmailService } from './email.service';

@ApiTags('Email Logs')
@Controller({ path: 'email-logs', version: '1' })
@UseGuards(AdminAuthGuard, PoliciesGuard)
export class EmailLogController {
  constructor(private readonly emailService: EmailService) {}

  @Get()
  @ApiAuth({
    type: EmailLogResDto,
    summary: 'Get paginated email logs',
    isPaginated: true,
    paginateOptions: {
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
    },
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.EmailLog),
  )
  findAll(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<EmailLogResDto>> {
    return this.emailService.findAll(query);
  }

  @Get(':id')
  @ApiAuth({ type: EmailLogResDto, summary: 'Get email log detail' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.EmailLog),
  )
  findOne(@Param('id') id: AutoIncrementID): Promise<EmailLogResDto> {
    return this.emailService.findOne(id);
  }
}
