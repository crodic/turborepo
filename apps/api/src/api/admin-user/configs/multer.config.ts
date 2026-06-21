import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import 'dotenv/config';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_ROOT = 'storage';
export const AVATAR_PATH = `${UPLOAD_ROOT}/avatars`;

export const avatarUploadOption: MulterOptions = {
  limits: { files: 1 },
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = AVATAR_PATH;
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
