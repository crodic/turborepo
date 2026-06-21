import { Injectable } from '@nestjs/common';
import {
  UploadFileOptions,
  UploadImageOptions,
  UploadVideoOptions,
} from '../types/upload.types';

@Injectable()
export class FileValidator {
  validateImage(
    file: Express.Multer.File,
    options: Pick<UploadImageOptions, 'allowedMimeTypes' | 'maxFileSize'>,
  ) {
    const {
      maxFileSize = 5 * 1024 * 1024,
      allowedMimeTypes = ['jpeg', 'png', 'webp'],
    } = options;

    if (file.size > maxFileSize) {
      throw new Error(`File size exceeds limit: ${maxFileSize}`);
    }

    const ext = this.detectExt(file.mimetype);
    if (!allowedMimeTypes.includes(ext)) {
      throw new Error(`Invalid file type: ${file.mimetype}`);
    }
  }

  validateFile(file: Express.Multer.File, options: UploadFileOptions) {
    const { maxFileSize = 15 * 1024 * 1024, allowedMimeTypes = [] } = options;

    if (file.size > maxFileSize) {
      throw new Error(`File exceeds limit: ${maxFileSize}`);
    }

    if (
      allowedMimeTypes.length > 0 &&
      !allowedMimeTypes.includes(file.mimetype)
    ) {
      throw new Error(`Invalid file type: ${file.mimetype}`);
    }
  }

  validateVideo(file: Express.Multer.File, options: UploadVideoOptions) {
    const { maxFileSize = 15 * 1024 * 1024, allowedMimeTypes = [] } = options;

    if (file.size > maxFileSize) {
      throw new Error(`File exceeds limit: ${maxFileSize}`);
    }

    if (
      allowedMimeTypes.length > 0 &&
      !allowedMimeTypes.includes(file.mimetype)
    ) {
      throw new Error(`Invalid file type: ${file.mimetype}`);
    }
  }

  detectExt(mime: string): 'jpeg' | 'png' | 'webp' {
    if (mime.includes('png')) return 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpeg';
    return 'webp';
  }
}
