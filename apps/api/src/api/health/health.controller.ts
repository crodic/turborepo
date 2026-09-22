import { AllConfigType } from '@/config/config.type';
import { Environment } from '@/constants/app.constant';
import { QueueName } from '@/constants/job.constant';
import { Public } from '@/decorators/public.decorator';
import { RedisService } from '@/redis/redis.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Queue } from 'bullmq';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly redisService: RedisService,
    @InjectQueue(QueueName.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QueueName.FILE) private readonly fileQueue: Queue,
  ) {}

  @Public()
  @ApiOperation({
    summary: 'Health check',
    description: 'Comprehensive system health check',
  })
  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    const list = [
      () => this.db.pingCheck('database'),
      () => this.checkRedis(),
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),
      () =>
        this.disk.checkStorage('storage_disk', {
          thresholdPercent: 0.95,
          path: process.platform === 'win32' ? 'C:\\' : '/',
        }),
      () => this.checkQueues(),
      () => this.checkSystem(),
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

  @Public()
  @ApiOperation({ summary: 'Queue statistics and Bull-Board url' })
  @Get('queues')
  async getQueueStats() {
    const [emailCounts, fileCounts] = await Promise.all([
      this.emailQueue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
        'paused',
      ),
      this.fileQueue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
        'paused',
      ),
    ]);

    const apiUrl =
      this.configService.get('app.url', { infer: true }) ||
      'http://localhost:8000';
    const apiPrefix =
      this.configService.get('app.apiPrefix', { infer: true }) || 'api';
    const bullBoardPath =
      this.configService.get('app.bullBoardPath', { infer: true }) || '/queues';
    const cleanPrefix = apiPrefix.replace(/^\/+|\/+$/g, '');
    const normalizedPath = bullBoardPath.startsWith('/')
      ? bullBoardPath
      : `/${bullBoardPath}`;

    return {
      bullBoardUrl: `${apiUrl}/${cleanPrefix}${normalizedPath}`,
      queues: [
        {
          name: QueueName.EMAIL,
          counts: emailCounts,
        },
        {
          name: QueueName.FILE,
          counts: fileCounts,
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    const start = Date.now();
    try {
      const client = this.redisService.getClient();
      const pong = await client.ping();
      const latency = `${Date.now() - start}ms`;
      if (pong === 'PONG') {
        return {
          redis: {
            status: 'up',
            latency,
          },
        };
      }
      return {
        redis: {
          status: 'down',
          message: 'Invalid ping response',
        },
      };
    } catch (error) {
      return {
        redis: {
          status: 'down',
          message: error instanceof Error ? error.message : 'Connection failed',
        },
      };
    }
  }

  private checkSystem(): HealthIndicatorResult {
    const uptimeSeconds = Math.floor(process.uptime());
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);

    return {
      system: {
        status: 'up',
        uptime: `${days}d ${hours}h ${minutes}m`,
        nodeVersion: process.version,
        platform: process.platform,
      },
    };
  }

  private async checkQueues(): Promise<HealthIndicatorResult> {
    try {
      const [emailCounts, fileCounts] = await Promise.all([
        this.emailQueue.getJobCounts(
          'waiting',
          'active',
          'failed',
          'completed',
        ),
        this.fileQueue.getJobCounts('waiting', 'active', 'failed', 'completed'),
      ]);

      const hasFailed =
        (emailCounts.failed ?? 0) > 0 || (fileCounts.failed ?? 0) > 0;

      return {
        queues: {
          status: hasFailed ? 'down' : 'up',
          hasFailedJobs: hasFailed,
          emailJobs: `wait: ${emailCounts.waiting} · act: ${emailCounts.active} · fail: ${emailCounts.failed}`,
          fileJobs: `wait: ${fileCounts.waiting} · act: ${fileCounts.active} · fail: ${fileCounts.failed}`,
        },
      };
    } catch (error) {
      return {
        queues: {
          status: 'down',
          message:
            error instanceof Error ? error.message : 'Failed to query queues',
        },
      };
    }
  }
}
