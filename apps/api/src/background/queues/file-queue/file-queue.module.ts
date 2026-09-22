import { FileModule } from '@/api/file/file.module';
import { QueueName, QueuePrefix } from '@/constants/job.constant';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
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
    BullBoardModule.forFeature({
      name: QueueName.FILE,
      adapter: BullMQAdapter,
    }),
  ],
  providers: [FileProcessor, FileQueueEvents],
})
export class FileQueueModule {}
