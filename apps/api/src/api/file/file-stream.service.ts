import { StorageDisk } from '@/filesystem/config/storage-config.type';
import { StorageDriver } from '@/filesystem/drivers/storage-driver.interface';
import { FilesystemService } from '@/filesystem/filesystem.service';
import { removeDiskPath } from '@/utils/filesystem';
import { ImageTransformer } from '@/utils/transformers/image.transformer';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Readable } from 'stream';
import { Repository } from 'typeorm';
import { FileEntity } from './entities/file.entity';
import { TransformationParser } from './parsers/transformation.parser';

export type StoredFileStream = {
  stream: Readable;
  mime: string;
  size: number;
};

export type TransformedFile = {
  buffer: Buffer;
  mime: string;
  size: number;
};

@Injectable()
export class FileStreamService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly storage: FilesystemService,
    private readonly transformationParser: TransformationParser,
    private readonly imageTransformer: ImageTransformer,
  ) {}

  private diskForFile(file: Pick<FileEntity, 'disk'>): StorageDriver {
    return this.storage.disk((file.disk as StorageDisk) ?? 'public');
  }

  private toStorageKey(path: string): string {
    const normalized = path.replace(/\\/g, '/');
    const legacyPrefixes = ['storage/public/', 'storage/private/'];
    const legacyPrefix = legacyPrefixes.find((prefix) =>
      normalized.includes(prefix),
    );

    if (legacyPrefix) {
      return normalized.slice(
        normalized.indexOf(legacyPrefix) + legacyPrefix.length,
      );
    }

    return removeDiskPath(normalized).replace(/^\/+/, '');
  }

  private getImageMime(format: string): string {
    switch (format) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'jpg':
      case 'jpeg':
      default:
        return 'image/jpeg';
    }
  }

  private normalizeImageFormat(ext: string): string {
    const normalized = ext.toLowerCase();

    return normalized === 'jpeg' ? 'jpg' : normalized;
  }

  async original(
    resourceType: string,
    publicId: string,
    ext: string,
  ): Promise<StoredFileStream> {
    const media = await this.fileRepository.findOneByOrFail({
      public_id: publicId,
    });

    if (media.resource_type !== resourceType) {
      throw new HttpException('Invalid resource type', HttpStatus.NOT_FOUND);
    }

    const storageKey = this.toStorageKey(media.path);
    const disk = this.diskForFile(media);
    const actualExt = storageKey.split('.').pop();
    if (actualExt !== ext) {
      throw new HttpException('Extension mismatch', HttpStatus.NOT_FOUND);
    }

    const exists = await disk.exists(storageKey);
    if (!exists) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    const stream = await disk.getStream(storageKey);

    return {
      stream,
      mime: media.mime,
      size: media.size,
    };
  }

  async transform(
    resourceType: string,
    transformations: string,
    publicId: string,
    ext: string,
  ): Promise<TransformedFile> {
    const media = await this.fileRepository.findOneByOrFail({
      public_id: publicId,
    });

    if (media.resource_type !== resourceType) {
      throw new HttpException('Invalid resource type', HttpStatus.NOT_FOUND);
    }

    const storageKey = this.toStorageKey(media.path);
    const disk = this.diskForFile(media);
    const actualExt = storageKey.split('.').pop();
    if (actualExt !== ext) {
      throw new HttpException('Extension mismatch', HttpStatus.NOT_FOUND);
    }

    if (media.resource_type !== 'image') {
      throw new BadRequestException('Only image transformations are supported');
    }

    const exists = await disk.exists(storageKey);
    if (!exists) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    const buffer = await disk.get(storageKey);
    const params = this.transformationParser.parse(transformations);
    params.format ??= this.normalizeImageFormat(ext);
    const transformed = await this.imageTransformer.transform(
      {
        buffer,
        mimetype: media.mime,
        originalname: media.original_name,
        fieldname: 'file',
        size: media.size,
      } as Express.Multer.File,
      params,
    );

    return {
      buffer: transformed.buffer,
      mime: this.getImageMime(transformed.format),
      size: transformed.size,
    };
  }
}
