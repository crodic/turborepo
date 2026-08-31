import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const WHITE_LABEL_UPLOAD_PATH = 'storage/public/white-label';
export const WHITE_LABEL_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const whiteLabelUploadOptions: MulterOptions = {
  limits: { fileSize: WHITE_LABEL_MAX_FILE_SIZE },
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const uploadPath = WHITE_LABEL_UPLOAD_PATH;
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
      const fileExtName = extname(file.originalname);
      const filename = `${uuidv4()}${fileExtName}`;
      cb(null, filename);
    },
  }),
};
