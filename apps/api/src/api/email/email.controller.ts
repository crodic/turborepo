import { AutoIncrementID } from '@/common/types/common.type';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { CheckPolicies } from '@/decorators/policies.decorator';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { AppAbility } from '@/libs/casl/ability.factory';
import { AppActions, AppSubjects } from '@/utils/permissions.constant';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import {
  FilterOperator,
  Paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { CreateEmailReqDto } from './dto/create-email.req.dto';
import { EmailLogResDto } from './dto/email-log.res.dto';
import { EmailRecipientOptionResDto } from './dto/email-recipient-option.res.dto';
import { UpdateEmailReqDto } from './dto/update-email.req.dto';
import { EmailService } from './email.service';

@ApiTags('Emails')
@Controller({ path: 'emails', version: '1' })
@UseGuards(AdminAuthGuard, PoliciesGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post()
  @ApiAuth({
    type: EmailLogResDto,
    statusCode: HttpStatus.CREATED,
    summary: 'Send or schedule admin email',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.Email),
  )
  create(
    @Body() dto: CreateEmailReqDto,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<EmailLogResDto> {
    return this.emailService.create(dto, adminId);
  }

  @Get('my')
  @ApiAuth({
    type: EmailLogResDto,
    summary: 'Get current admin emails',
    isPaginated: true,
    paginateOptions: {
      sortableColumns: ['id', 'createdAt', 'scheduledAt', 'sentAt', 'status'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        status: [FilterOperator.IN],
        subject: [FilterOperator.ILIKE],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE],
        scheduledAt: [FilterOperator.GTE, FilterOperator.LTE],
        sentAt: [FilterOperator.GTE, FilterOperator.LTE],
      },
    },
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Email),
  )
  findMine(
    @Paginate() query: PaginateQuery,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<Paginated<EmailLogResDto>> {
    return this.emailService.findMine(query, adminId);
  }

  @Get('recipients')
  @ApiAuth({
    type: EmailRecipientOptionResDto,
    summary: 'Search email recipients',
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.Email),
  )
  searchRecipients(
    @Query('search') search?: string,
  ): Promise<EmailRecipientOptionResDto[]> {
    return this.emailService.searchRecipients(search);
  }

  @Get(':id')
  @ApiAuth({ type: EmailLogResDto, summary: 'Get current admin email detail' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Email),
  )
  findMineOne(
    @Param('id') id: AutoIncrementID,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<EmailLogResDto> {
    return this.emailService.findMineOne(id, adminId);
  }

  @Patch(':id')
  @ApiAuth({ type: EmailLogResDto, summary: 'Edit scheduled email' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.Email),
  )
  updateScheduled(
    @Param('id') id: AutoIncrementID,
    @Body() dto: UpdateEmailReqDto,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<EmailLogResDto> {
    return this.emailService.updateScheduled(id, dto, adminId);
  }

  @Post(':id/cancel')
  @ApiAuth({ type: EmailLogResDto, summary: 'Cancel scheduled email' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Delete, AppSubjects.Email),
  )
  cancelScheduled(
    @Param('id') id: AutoIncrementID,
    @CurrentUser('id') adminId: AutoIncrementID,
  ): Promise<EmailLogResDto> {
    return this.emailService.cancelScheduled(id, adminId);
  }
}
