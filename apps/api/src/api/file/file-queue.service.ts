import { IFileUploadJob } from '@/common/interfaces/job.interface';
import { JobName, QueueName } from '@/constants/job.constant';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class FileQueueService {
  private readonly logger = new Logger(FileQueueService.name);

  constructor(@InjectQueue(QueueName.FILE) private readonly fileQueue: Queue) {}

  /**
   * Adds a file upload job to the background queue.
   * Note: The file should be saved temporarily on disk before calling this.
   */
  async queueFileUpload(payload: IFileUploadJob): Promise<void> {
    this.logger.debug(`Adding file upload job for ${payload.originalName}`);

    await this.fileQueue.add(JobName.FILE_UPLOAD, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
