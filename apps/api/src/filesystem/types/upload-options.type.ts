import type { ExecutionContext } from '@nestjs/common';
import type { Express } from 'express';
import 'multer';
import type { StorageDisk } from '../config/storage-config.type';

export type FileValidationRule =
  | { type: 'type'; allowedMimeTypes: string[]; allowedExtensions?: string[] }
  | {
      type: 'size';
      maxSize: number;
      minSize?: number;
      whenMimeType?: string | string[];
    }
  | {
      type: 'custom';
      validate: (file: Express.Multer.File) => boolean | Promise<boolean>;
      message?: string;
    };

export interface FileUploadInterceptorOptions {
  fieldName: string;
  disk?: StorageDisk;
  maxCount?: number;
  rules?: FileValidationRule[];
  isArray?: boolean;
  filenameGenerator?: (
    file: Express.Multer.File,
    context: ExecutionContext,
  ) => Promise<string> | string;
  uploadPath?:
    | string
    | ((
        file: Express.Multer.File,
        context: ExecutionContext,
      ) => string | Promise<string>);
  visibility?: 'public' | 'private';
}
