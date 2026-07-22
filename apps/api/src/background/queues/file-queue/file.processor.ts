import { FileService } from '@/api/file/file.service';
import { UploadFileOptions } from '@/api/file/types/upload.types';
import { IFileUploadJob } from '@/common/interfaces/job.interface';
import { JobName, QueueName } from '@/constants/job.constant';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { readFile, rm } from 'fs/promises';

@Processor(QueueName.FILE, {
  concurrency: 2,
})
export class FileProcessor extends WorkerHost {
  private readonly logger = new Logger(FileProcessor.name);

  constructor(
    private readonly fileService: FileService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<IFileUploadJob>, _token?: string): Promise<string> {
    this.logger.debug(
      `Processing job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data)}...`,
    );

    if (job.name === JobName.FILE_UPLOAD) {
      return this.handleFileUpload(job);
    }

    throw new Error(`Unsupported job type: ${job.name}`);
  }

  private async handleFileUpload(job: Job<IFileUploadJob>): Promise<string> {
    const {
      filePath,
      originalName,
      mimetype,
      size,
      destinationPath,
      callbackEventName,
    } = job.data;

    this.logger.log(
      `Starting background upload for ${originalName} (Job ID: ${job.id})`,
    );

    try {
      // Read file from temp path
      const buffer = await readFile(filePath);

      // Create a mock Multer file object for FileService
      const multerFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: originalName,
        encoding: '7bit',
        mimetype,
        size,
        buffer,
        stream: null as any,
        destination: '',
        filename: originalName,
        path: filePath,
      };

      const options: UploadFileOptions = {
        folder: destinationPath,
      };

      // Call FileService to upload
      const fileEntity = await this.fileService.uploadFile(multerFile, options);

      this.logger.log(
        `Successfully uploaded ${originalName} to ${fileEntity.path}`,
      );

      // Clean up the temp file
      await rm(filePath, { force: true });

      // Emit event if callback event name is provided
      if (callbackEventName) {
        this.eventEmitter.emit(callbackEventName, {
          jobId: job.id,
          file: fileEntity,
          metadata: job.data.metadata,
        });
      }

      // Return the generated path or full file entity data.
      // You can listen to this result in FileQueueEvents (onCompleted) to update the database.
      return JSON.stringify({
        path: fileEntity.path,
        originalName,
        metadata: job.data.metadata,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to process background upload for ${originalName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
