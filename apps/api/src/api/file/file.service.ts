import { StorageDriver } from '@/libs/filesystem/lib/file-storage.interface';
import { FileStorageService } from '@/libs/filesystem/lib/file-storage.service';
import { applyFormat, extractExt, removeDiskPath } from '@/utils/filesystem';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { createHash } from 'crypto';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { posix as posixPath } from 'path';
import sharp from 'sharp';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { FILE_UPLOAD_MAX_SIZE } from './config/file.config';
import { FileResDto } from './dto/file.res.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { FileEntity } from './entities/file.entity';
import { FileFolderService } from './file-folder.service';
import { UploadFileOptions, UploadImageOptions } from './types/upload.types';
import { FileValidator } from './validators/file.validator';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly fileValidator: FileValidator,
    private readonly storage: FileStorageService,
    private readonly fileFolderService: FileFolderService,
  ) {}

  private get disk(): StorageDriver {
    return this.storage.disk();
  }

  private get currentDiskName(): string {
    return (this.storage.config?.default as string | undefined) ?? 'public';
  }

  private writeDisk(disk?: string | null): StorageDriver {
    return this.storage.disk(disk || this.currentDiskName);
  }

  private normalizeUploadDisk(disk?: string | null): string {
    const targetDisk = disk || this.currentDiskName;

    if (!['local', 'public'].includes(targetDisk)) {
      throw new BadRequestException(
        'Only local and public disks are supported',
      );
    }

    return targetDisk;
  }

  private diskForFile(file: Pick<FileEntity, 'disk'>): StorageDriver {
    return this.storage.disk(file.disk ?? 'public');
  }

  private async deleteStoredFileIfExists(
    file: Pick<FileEntity, 'disk' | 'path'>,
  ) {
    const disk = this.diskForFile(file);
    const storageKey = this.toStorageKey(file.path);

    if (await disk.exists(storageKey)) {
      await disk.delete(storageKey);
    }
  }

  async findAll(query: PaginateQuery): Promise<Paginated<FileResDto>> {
    const queryBuilder = this.fileRepository.createQueryBuilder('file');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: [
        'id',
        'public_id',
        'original_name',
        'folder',
        'disk',
        'mime',
        'size',
        'resource_type',
        'status',
        'createdAt',
        'updatedAt',
      ],
      searchableColumns: [
        'public_id',
        'original_name',
        'folder',
        'disk',
        'mime',
      ],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        public_id: [FilterOperator.EQ],
        original_name: [FilterOperator.ILIKE],
        folder: [FilterOperator.EQ, FilterOperator.ILIKE],
        disk: [FilterOperator.EQ, FilterOperator.IN],
        mime: [FilterOperator.ILIKE],
        resource_type: [FilterOperator.EQ, FilterOperator.IN],
        status: [FilterOperator.EQ, FilterOperator.IN],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
      },
    });

    return {
      ...result,
      data: plainToInstance(FileResDto, result.data, {
        excludeExtraneousValues: true,
      }),
    } as Paginated<FileResDto>;
  }

  async findOne(publicId: string): Promise<FileResDto> {
    const file = await this.fileRepository.findOneByOrFail({
      public_id: publicId,
    });

    return plainToInstance(FileResDto, file, {
      excludeExtraneousValues: true,
    });
  }

  async update(publicId: string, dto: UpdateFileDto): Promise<FileResDto> {
    const file = await this.fileRepository.findOneByOrFail({
      public_id: publicId,
    });

    if (dto.folder !== undefined) {
      file.folder = this.fileFolderService.normalizeFolder(dto.folder);
    }

    if (dto.status !== undefined) {
      file.status = dto.status;
    }

    const saved = await this.fileRepository.save(file);

    return plainToInstance(FileResDto, saved, {
      excludeExtraneousValues: true,
    });
  }

  async upload(file: Express.Multer.File, folder?: string, disk?: string) {
    if (!file) {
      throw new HttpException('File not provided', HttpStatus.BAD_REQUEST);
    }

    this.fileValidator.validateFile(file, {
      maxFileSize: FILE_UPLOAD_MAX_SIZE,
    });

    const mime = file.mimetype;
    const resourceType = this.detectResourceType(mime);
    const publicId = uuidv4().replace(/-/g, '').slice(0, 20);

    const ext = file.originalname.split('.').pop();
    const normalizedFolder = this.fileFolderService.normalizeFolder(folder);
    const folderPath = normalizedFolder
      ? posixPath.join(resourceType, normalizedFolder)
      : resourceType;
    const storedPath = this.makeStorageKey(folderPath, `${publicId}.${ext}`);

    const uploadDiskName = this.normalizeUploadDisk(disk);
    await this.writeDisk(uploadDiskName).put(storedPath, file.buffer, {
      ContentType: mime,
      visibility: 'public',
    });

    const media = await this.createFileRecord({
      publicId,
      folder: normalizedFolder,
      originalName: file.originalname,
      path: storedPath,
      disk: uploadDiskName,
      mime,
      size: file.size,
      resourceType,
      buffer: file.buffer,
    });

    return plainToInstance(FileResDto, media, {
      excludeExtraneousValues: true,
    });
  }

  async delete(publicId: string): Promise<{ message: string }> {
    const file = await this.fileRepository.findOneByOrFail({
      public_id: publicId,
    });

    await this.deleteStoredFileIfExists(file);

    await this.fileRepository.delete({ public_id: publicId });

    return {
      message: 'Successfully deleted',
    };
  }

  async uploadImage(
    file: Express.Multer.File,
    options: UploadImageOptions = {},
  ) {
    const {
      folder,
      format,
      quality = 80,
      compress = true,
      sizes = [],
      generateThumbnail = false,
      thumbnailWidth = 300,
    } = options;

    this.fileValidator.validateImage(file, options);

    const detectedExt = extractExt(file.mimetype);

    const baseName = file.originalname.replace(/\.[^.]+$/, '');
    const ext = format ?? detectedExt;
    const filename = `${Date.now()}-${baseName}.${ext}`;

    let img = sharp(file.buffer);

    if (format) {
      img = applyFormat(img, format, quality);
    } else if (compress) {
      img = img.webp({ quality });
    }

    const buffer = await img.toBuffer();
    const targetPath = this.makeStorageKey(folder, filename);

    await this.disk.put(targetPath, buffer, {
      ContentType: `image/${ext}`,
      visibility: 'public',
    });

    const result = {
      original: await this.getStorageUrl(targetPath),
      sizes: {} as Record<string, string>,
      thumbnail: null as string | null,
    };

    // Process multi-size
    for (const size of sizes) {
      const resizedFolder = folder ? `${folder}/${size.name}` : size.name;

      const resizedName = `${Date.now()}-${baseName}-${size.name}.${ext}`;

      const sizeBuffer = await sharp(file.buffer).resize(size.width).toBuffer();

      const resizedPath = this.makeStorageKey(resizedFolder, resizedName);

      await this.disk.put(resizedPath, sizeBuffer, {
        ContentType: `image/${ext}`,
        visibility: 'public',
      });

      result.sizes[size.name] = await this.getStorageUrl(resizedPath);
    }

    // Thumbnail
    if (generateThumbnail) {
      const thumbFolder = folder ? `${folder}/thumb` : 'thumb';
      const thumbName = `${Date.now()}-${baseName}-thumb.${ext}`;

      const thumbnailBuffer = await sharp(file.buffer)
        .resize(Number(thumbnailWidth))
        .toBuffer();

      const thumbnailPath = this.makeStorageKey(thumbFolder, thumbName);

      await this.disk.put(thumbnailPath, thumbnailBuffer, {
        ContentType: `image/${ext}`,
        visibility: 'public',
      });

      result.thumbnail = await this.getStorageUrl(thumbnailPath);
    }

    return result;
  }

  async uploadFile(file: Express.Multer.File, options: UploadFileOptions = {}) {
    const { folder = 'docs', rename = true } = options;

    this.fileValidator.validateFile(file, options);

    const ext = file.originalname.split('.').pop();
    const base = file.originalname.replace(/\.[^.]+$/, '');

    const filename = rename
      ? `${Date.now()}-${base}.${ext}`
      : file.originalname;

    const storedPath = this.makeStorageKey(folder, filename);

    await this.disk.put(storedPath, file.buffer, {
      ContentType: file.mimetype,
      visibility: 'public',
    });

    return {
      path: await this.getStorageUrl(storedPath),
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  private generateHash(): string {
    const now = Date.now().toString();
    const rand = uuidv4();
    return createHash('sha256')
      .update(rand + now + Math.random().toString())
      .digest('hex');
  }

  private async createFileRecord({
    publicId,
    folder,
    disk,
    originalName,
    path,
    mime,
    size,
    resourceType,
    buffer,
    metadataPath,
  }: {
    publicId: string;
    folder: string | null;
    disk: string;
    originalName: string;
    path: string;
    mime: string;
    size: number;
    resourceType: string;
    buffer?: Buffer;
    metadataPath?: string;
  }): Promise<FileEntity> {
    let width: number | null = null;
    let height: number | null = null;

    if (resourceType === 'image') {
      try {
        const meta = buffer
          ? await sharp(buffer).metadata()
          : await sharp(metadataPath ?? path).metadata();
        width = meta.width ?? null;
        height = meta.height ?? null;
      } catch (err) {
        this.logger.warn(`Failed to read image metadata: ${err}`);
      }
    }

    const media = this.fileRepository.create({
      public_id: publicId,
      folder,
      disk,
      original_name: originalName,
      path,
      hash: this.generateHash(),
      mime,
      size,
      width,
      height,
      duration: null,
      resource_type: resourceType,
      status: 'active',
    });

    return this.fileRepository.save(media);
  }

  private detectResourceType(mime: string): string {
    if (mime.includes('image')) return 'image';
    if (mime.includes('video')) return 'video';
    return 'raw';
  }

  private makeStorageKey(...parts: Array<string | null | undefined>): string {
    return posixPath
      .join(
        ...parts
          .filter((part): part is string => Boolean(part))
          .map((part) => part.replace(/\\/g, '/')),
      )
      .replace(/^\/+/, '');
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

  private async getStorageUrl(path: string): Promise<string> {
    if (this.disk.url) {
      return this.disk.url(path);
    }

    return path;
  }
}
