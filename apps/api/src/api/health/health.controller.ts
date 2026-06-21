import { AllConfigType } from '@/config/config.type';
import { Environment } from '@/constants/app.constant';
import { Public } from '@/decorators/public.decorator';
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private configService: ConfigService<AllConfigType>,
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Public()
  @ApiOperation({ summary: 'Health check', description: 'Health check' })
  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    const list = [
      () => this.db.pingCheck('database'),
      ...(this.configService.get('app.nodeEnv', { infer: true }) ===
      Environment.DEVELOPMENT
        ? [
            () =>
              this.http.responseCheck(
                'api-docs',
                `${this.configService.get('app.url', { infer: true })}/api-docs`,
                (res) => res.status === 200,
                {
                  auth: {
                    username: this.configService.get(
                      'auth.adminPanelUsername',
                      {
                        infer: true,
                      },
                    ),
                    password: this.configService.get(
                      'auth.adminPanelPassword',
                      {
                        infer: true,
                      },
                    ),
                  },
                },
              ),
          ]
        : []),
    ];
    return this.health.check(list);
  }
}
