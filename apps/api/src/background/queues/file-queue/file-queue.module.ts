import { FileModule } from '@/api/file/file.module';
import { QueueName, QueuePrefix } from '@/constants/job.constant';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { FileQueueEvents } from './file-queue.events';
import { FileProcessor } from './file.processor';

@Module({
  imports: [
    FileModule,
    BullModule.registerQueue({
      name: QueueName.FILE,
      prefix: QueuePrefix.FILE,
      streams: {
        events: {
          maxLen: 1000,
        },
      },
    }),
  ],
  providers: [FileProcessor, FileQueueEvents],
})
export class FileQueueModule {}
