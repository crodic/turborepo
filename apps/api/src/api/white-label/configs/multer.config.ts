import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

export const WHITE_LABEL_UPLOAD_PATH = 'storage/public/white-label';
export const WHITE_LABEL_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const whiteLabelUploadOptions: MulterOptions = {
  limits: { fileSize: WHITE_LABEL_MAX_FILE_SIZE },
  storage: memoryStorage(),
};
