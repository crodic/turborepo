import {
  type ExecutionContext,
  SetMetadata,
  UseInterceptors,
  applyDecorators,
  createParamDecorator,
} from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import type { StoredFile } from '../types/stored-file.type';
import type { FileUploadInterceptorOptions } from '../types/upload-options.type';
import { FileUploadInterceptorMixin } from './upload-file.decorator';

export const FILES_UPLOAD_OPTIONS_KEY = 'filesUploadOptions';

/**
 * Decorator for uploading multiple files with automatic Swagger docs & storage processing.
 */
export function UploadFiles(
  fieldName = 'files',
  options: Omit<FileUploadInterceptorOptions, 'fieldName' | 'isArray'> = {},
) {
  const opts: FileUploadInterceptorOptions = {
    ...options,
    fieldName,
    isArray: true,
  };

  return applyDecorators(
    SetMetadata(FILES_UPLOAD_OPTIONS_KEY, opts),
    UseInterceptors(FileUploadInterceptorMixin(opts)),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary',
            },
          },
        },
      },
    }),
  );
}

/**
 * Parameter decorator to extract the processed StoredFile array from request.
 */
export const UploadedFiles = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): StoredFile[] => {
    const req = ctx
      .switchToHttp()
      .getRequest<{ uploadedFiles?: StoredFile[] }>();
    return req.uploadedFiles ?? [];
  },
);
