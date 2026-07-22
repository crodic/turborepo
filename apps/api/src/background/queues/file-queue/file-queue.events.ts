import { QueueName } from '@/constants/job.constant';
import {
  OnQueueEvent,
  QueueEventsHost,
  QueueEventsListener,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

@QueueEventsListener(QueueName.FILE)
export class FileQueueEvents extends QueueEventsHost {
  private readonly logger = new Logger(FileQueueEvents.name);

  @OnQueueEvent('completed')
  onCompleted({ jobId, returnvalue }: { jobId: string; returnvalue: string }) {
    this.logger.log(`Job ${jobId} has completed! Result: ${returnvalue}`);
  }

  @OnQueueEvent('failed')
  onFailed({ jobId, failedReason }: { jobId: string; failedReason: string }) {
    this.logger.error(`Job ${jobId} has failed with reason: ${failedReason}`);
  }

  @OnQueueEvent('stalled')
  onStalled({ jobId }: { jobId: string }) {
    this.logger.warn(`Job ${jobId} has been stalled`);
  }
}
