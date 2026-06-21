import { EmailLogEntity } from '@/api/email/entities/email-log.entity';
import { NotificationModule } from '@/api/notification/notification.module';
import { QueueName, QueuePrefix } from '@/constants/job.constant';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailQueueEvents } from './email-queue.events';
import { EmailQueueService } from './email-queue.service';
import { EmailProcessor } from './email.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailLogEntity]),
    NotificationModule,
    BullModule.registerQueue({
      name: QueueName.EMAIL,
      prefix: QueuePrefix.AUTH,
      streams: {
        events: {
          maxLen: 1000,
        },
      },
    }),
  ],
  providers: [EmailQueueService, EmailProcessor, EmailQueueEvents],
  exports: [EmailQueueService],
})
export class EmailQueueModule {}
