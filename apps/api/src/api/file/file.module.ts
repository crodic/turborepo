import { StorageModule } from '@/libs/filesystem/storage.module';
import { ImageTransformer } from '@/utils/transformers/image.transformer';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { TransformationParser } from './parsers/transformation.parser';
import { TransformController } from './transform.controller';
import { FileValidator } from './validators/file.validator';

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity]), StorageModule],
  controllers: [FileController, TransformController],
  providers: [
    FileService,
    TransformationParser,
    ImageTransformer,
    FileValidator,
  ],
})
export class FileModule {}
