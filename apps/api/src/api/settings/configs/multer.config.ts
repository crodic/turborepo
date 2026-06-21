import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const WEB_PATH = 'storage/public/website';
export const WEBSITE_MAX_FILE_SIZE = 2 * 1024 * 1024;

export const websiteUploadOptions: MulterOptions = {
  limits: { fileSize: WEBSITE_MAX_FILE_SIZE },
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = WEB_PATH;
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const fileExtName = extname(file.originalname);
      const filename = `${uuidv4()}${fileExtName}`;
      cb(null, filename);
    },
  }),
};
