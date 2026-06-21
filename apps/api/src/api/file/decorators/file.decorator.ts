import { applyDecorators, UseInterceptors } from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { memoryStorageConfig } from '../config/file.config';

export function UploadSingle(name = 'file') {
  return applyDecorators(
    UseInterceptors(FileInterceptor(name, memoryStorageConfig)),
  );
}

export function UploadMultiple(name = 'files', max?: number) {
  return applyDecorators(
    UseInterceptors(FilesInterceptor(name, max, memoryStorageConfig)),
  );
}

export function UploadMultipleFields(
  fields: { name: string; maxCount?: number }[],
) {
  return applyDecorators(
    UseInterceptors(FileFieldsInterceptor(fields, memoryStorageConfig)),
  );
}
