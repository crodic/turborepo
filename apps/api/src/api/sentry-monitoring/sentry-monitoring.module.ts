import { Module } from '@nestjs/common';
import { SentryMonitoringController } from './sentry-monitoring.controller';
import { SentryMonitoringService } from './sentry-monitoring.service';

@Module({
  controllers: [SentryMonitoringController],
  providers: [SentryMonitoringService],
})
export class SentryMonitoringModule {}
