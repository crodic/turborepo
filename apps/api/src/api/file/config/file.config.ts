import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

export const FILE_UPLOAD_MAX_SIZE = 500 * 1024 * 1024;

export const memoryStorageConfig: MulterOptions = {
  storage: memoryStorage(),
};

export const FILE_EXTENSIONS = {
  images: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/tiff',
    'image/bmp',
    'image/avif',
    'image/webp',
    'image/ico',
  ],
  files: [
    'application/pdf',
    'application/msword',
    'application/vnd.ms-excel',
    'application/zip',
    'text/plain',
    'text/csv',
  ],
};
