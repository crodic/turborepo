import { QueueName } from '@/constants/job.constant';
import { StorageModule } from '@/libs/filesystem/storage.module';
import { ImageTransformer } from '@/utils/transformers/image.transformer';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { FileCleanupService } from './file-cleanup.service';
import { FileQueueService } from './file-queue.service';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { FileStorageAccessGuard } from './guards/file-storage-access.guard';
import { TransformationParser } from './parsers/transformation.parser';
import { SortableImageCacheService } from './sortable-image-cache.service';
import { SortableImageUploadService } from './sortable-image-upload.service';
import { TransformController } from './transform.controller';
import { FileValidator } from './validators/file.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity]),
    StorageModule,
    BullModule.registerQueue({
      name: QueueName.FILE,
    }),
  ],
  controllers: [FileController, TransformController],
  providers: [
    FileService,
    FileQueueService,
    FileCleanupService,
    FileStorageAccessGuard,
    TransformationParser,
    ImageTransformer,
    FileValidator,
    SortableImageUploadService,
    SortableImageCacheService,
  ],
  exports: [FileService, SortableImageUploadService, FileQueueService],
})
export class FileModule {}
