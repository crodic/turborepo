import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

export const WEB_PATH = 'storage/public/website';
export const WEBSITE_MAX_FILE_SIZE = 2 * 1024 * 1024;

export const websiteUploadOptions: MulterOptions = {
  limits: { fileSize: WEBSITE_MAX_FILE_SIZE },
  storage: memoryStorage(),
};
