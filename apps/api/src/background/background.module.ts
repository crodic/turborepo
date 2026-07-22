import { Module } from '@nestjs/common';
import { EmailQueueModule } from './queues/email-queue/email-queue.module';
import { FileQueueModule } from './queues/file-queue/file-queue.module';

@Module({
  imports: [EmailQueueModule, FileQueueModule],
})
export class BackgroundModule {}
