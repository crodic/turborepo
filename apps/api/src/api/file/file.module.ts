import { StorageModule } from '@/libs/filesystem/storage.module';
import { ImageTransformer } from '@/utils/transformers/image.transformer';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { FileStorageAccessGuard } from './guards/file-storage-access.guard';
import { TransformationParser } from './parsers/transformation.parser';
import { SortableImageCacheService } from './sortable-image-cache.service';
import { TransformController } from './transform.controller';
import { FileValidator } from './validators/file.validator';

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity]), StorageModule],
  controllers: [FileController, TransformController],
  providers: [
    FileService,
    FileStorageAccessGuard,
    TransformationParser,
    ImageTransformer,
    FileValidator,
    SortableImageCacheService,
  ],
})
export class FileModule {}
