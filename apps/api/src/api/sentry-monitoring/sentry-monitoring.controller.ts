import { ApiAuth } from '@/decorators/http.decorators';
import { CheckPolicies } from '@/decorators/policies.decorator';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { AppAbility } from '@/libs/casl/ability.factory';
import { AppActions, AppSubjects } from '@/utils/permissions.constant';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SentryMonitoringService } from './sentry-monitoring.service';

@ApiTags('Sentry Monitoring')
@Controller({ path: 'sentry', version: '1' })
@UseGuards(AdminAuthGuard, PoliciesGuard)
export class SentryMonitoringController {
  constructor(
    private readonly sentryMonitoringService: SentryMonitoringService,
  ) {}

  @Get('summary')
  @ApiAuth({ summary: 'Get Sentry dashboard summary' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Log),
  )
  summary() {
    return this.sentryMonitoringService.getSummary();
  }
}
