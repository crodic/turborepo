import { QueueName, QueuePrefix } from '@/constants/job.constant';
import { RedisModule } from '@/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    RedisModule,
    BullModule.registerQueue({
      name: QueueName.EMAIL,
      prefix: QueuePrefix.AUTH,
    }),
    BullModule.registerQueue({
      name: QueueName.FILE,
      prefix: QueuePrefix.FILE,
    }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
