import { DomainType } from '@/constants/entity.enum';
import { Domain } from '@/decorators/domain.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { CheckPolicies } from '@/decorators/policies.decorator';
import { AppAbility } from '@/libs/casl/ability.factory';
import { AppActions, AppSubjects } from '@/utils/permissions.constant';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SentryMonitoringService } from './sentry-monitoring.service';

@ApiTags('Sentry Monitoring')
@Controller({ path: 'sentry', version: '1' })
@Domain(DomainType.ADMIN)
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
