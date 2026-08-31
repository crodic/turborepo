import {
  type ExecutionContext,
  Injectable,
  SetMetadata,
  type Type,
  UseInterceptors,
  applyDecorators,
  createParamDecorator,
  mixin,
} from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FilesystemService } from '../filesystem.service';
import { FileUploadInterceptor } from '../interceptors/file-upload.interceptor';
import type { StoredFile } from '../types/stored-file.type';
import type { FileUploadInterceptorOptions } from '../types/upload-options.type';

export const FILE_UPLOAD_OPTIONS_KEY = 'fileUploadOptions';

/**
 * Mixin to create a FileUploadInterceptor with custom options and DI injection.
 */
export function FileUploadInterceptorMixin(
  options: FileUploadInterceptorOptions,
): Type<FileUploadInterceptor> {
  @Injectable()
  class MixinInterceptor extends FileUploadInterceptor {
    constructor(filesystemService: FilesystemService) {
      super(filesystemService, options);
    }
  }
  return mixin(MixinInterceptor);
}

/**
 * Decorator for uploading a single file with automatic Swagger docs & storage processing.
 */
export function UploadFile(
  fieldName = 'file',
  options: Omit<FileUploadInterceptorOptions, 'fieldName' | 'isArray'> = {},
) {
  const opts: FileUploadInterceptorOptions = {
    ...options,
    fieldName,
    isArray: false,
  };

  return applyDecorators(
    SetMetadata(FILE_UPLOAD_OPTIONS_KEY, opts),
    UseInterceptors(FileUploadInterceptorMixin(opts)),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
  );
}

/**
 * Parameter decorator to extract the processed StoredFile from request.
 */
export const UploadedFile = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): StoredFile | undefined => {
    const req = ctx.switchToHttp().getRequest<{ uploadedFile?: StoredFile }>();
    return req.uploadedFile;
  },
);
