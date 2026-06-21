import { Module } from '@nestjs/common';
import 'dotenv/config';
import { NestLensModule } from 'nestlens';

@Module({
  imports: [
    NestLensModule.forRoot({
      enabled: !!process.env.NEST_LENS_ENABLED,
      storage: {
        driver: 'redis',
        memory: { maxEntries: 100000 },
        redis: {
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: Number(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
        },
      },
      watchers: {
        request: {
          enabled: true,
        },
        query: {
          enabled: true,
        },
        mail: {
          enabled: true,
        },
        cache: {
          enabled: true,
        },
        command: {
          enabled: true,
        },
        httpClient: {
          enabled: true,
        },
        exception: {
          enabled: true,
        },
        log: {
          enabled: true,
        },
      },
    }),
  ],
})
export class MonitoringModule {}
