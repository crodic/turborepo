import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Express, Request, RequestHandler, Response } from 'express';
import multer, { memoryStorage, MulterError } from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import type { Observable } from 'rxjs';
import type { StorageDriver } from '../drivers/storage-driver.interface';
import { FilesystemService } from '../filesystem.service';
import type { StoredFile } from '../types/stored-file.type';
import type {
  FileUploadInterceptorOptions,
  FileValidationRule,
} from '../types/upload-options.type';

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  private readonly upload: multer.Multer;

  constructor(
    private readonly filesystemService: FilesystemService,
    private readonly options: FileUploadInterceptorOptions,
  ) {
    this.upload = multer({
      storage: memoryStorage(),
    });
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const req = http.getRequest<
      Request & { uploadedFile?: StoredFile; uploadedFiles?: StoredFile[] }
    >();
    const res = http.getResponse<Response>();

    await this.runMulter(req, res);

    const rawFiles = this.extractRawFiles(req);
    if (rawFiles.length === 0) {
      return next.handle();
    }

    if (this.options.rules && this.options.rules.length > 0) {
      const rules = this.options.rules;
      await Promise.all(
        rawFiles.map(async (file) => {
          await this.validateFile(file, rules);
        }),
      );
    }

    const diskName = this.options.disk;
    const disk = this.filesystemService.disk(diskName);

    const storedFiles = await Promise.all(
      rawFiles.map(async (file) => {
        return await this.saveFile(file, context, disk, diskName ?? 'public');
      }),
    );

    if (this.options.isArray) {
      req.uploadedFiles = storedFiles;
    } else {
      req.uploadedFile = storedFiles[0];
    }

    return next.handle();
  }

  private async runMulter(req: Request, res: Response): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const handler: RequestHandler = this.options.isArray
        ? this.upload.array(this.options.fieldName, this.options.maxCount)
        : this.upload.single(this.options.fieldName);

      handler(req, res, (err: unknown) => {
        if (!err) {
          resolve();
          return;
        }

        if (err instanceof MulterError || err instanceof Error) {
          reject(new BadRequestException(err.message));
          return;
        }

        reject(new BadRequestException('Error uploading file'));
      });
    });
  }

  private extractRawFiles(req: Request): Express.Multer.File[] {
    if (this.options.isArray) {
      return (req.files as Express.Multer.File[] | undefined) ?? [];
    }
    return req.file ? [req.file] : [];
  }

  private async saveFile(
    file: Express.Multer.File,
    context: ExecutionContext,
    disk: StorageDriver,
    diskName: string,
  ): Promise<StoredFile> {
    const filename = this.options.filenameGenerator
      ? await this.options.filenameGenerator(file, context)
      : this.generateDefaultFilename(file);

    let targetDir = '';
    if (typeof this.options.uploadPath === 'function') {
      targetDir = await this.options.uploadPath(file, context);
    } else if (typeof this.options.uploadPath === 'string') {
      targetDir = this.options.uploadPath;
    }

    const filePath = targetDir
      ? path.posix.join(targetDir, filename)
      : filename;

    await disk.put(filePath, file.buffer, {
      mimeType: file.mimetype,
      visibility: this.options.visibility ?? 'public',
    });

    const fileUrl = disk.url(filePath);

    return {
      fieldName: file.fieldname,
      originalName: file.originalname,
      encoding: (file as { encoding?: string }).encoding ?? '7bit',
      mimetype: file.mimetype,
      size: file.size,
      disk: diskName,
      path: filePath,
      url: fileUrl,
      buffer: file.buffer,
    };
  }

  private async validateFile(
    file: Express.Multer.File,
    rules: FileValidationRule[],
  ): Promise<void> {
    await Promise.all(
      rules.map(async (rule) => {
        if (rule.type === 'size') {
          this.validateFileSize(file, rule.maxSize, rule.minSize);
        } else if (rule.type === 'type') {
          this.validateMimeType(file, rule.allowedMimeTypes);
        } else {
          const isValid = await rule.validate(file);
          if (!isValid) {
            throw new UnprocessableEntityException(
              rule.message ??
                `File '${file.originalname}' failed custom validation`,
            );
          }
        }
      }),
    );
  }

  private validateFileSize(
    file: Express.Multer.File,
    maxSize?: number,
    minSize?: number,
  ): void {
    if (maxSize && file.size > maxSize) {
      throw new UnprocessableEntityException(
        `File '${file.originalname}' exceeds the maximum allowed size of ${maxSize} bytes`,
      );
    }
    if (minSize && file.size < minSize) {
      throw new UnprocessableEntityException(
        `File '${file.originalname}' is smaller than minimum required size of ${minSize} bytes`,
      );
    }
  }

  private validateMimeType(
    file: Express.Multer.File,
    allowedMimeTypes: string[],
  ): void {
    const allowed = allowedMimeTypes.some((mime) => {
      if (mime.endsWith('/*')) {
        const prefix = mime.slice(0, -2);
        return file.mimetype.startsWith(prefix);
      }
      return file.mimetype === mime;
    });

    if (!allowed) {
      throw new UnprocessableEntityException(
        `File '${file.originalname}' has invalid MIME type '${file.mimetype}'. Allowed: ${allowedMimeTypes.join(', ')}`,
      );
    }
  }

  private generateDefaultFilename(file: Express.Multer.File): string {
    const ext = path.extname(file.originalname);
    const randomHex = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}-${randomHex}${ext}`;
  }
}
