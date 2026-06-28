import { AllConfigType } from '@/config/config.type';
import { FileStorageService } from '@/libs/filesystem/lib/file-storage.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { posix as posixPath } from 'path';

type SortableImageCacheItem = {
  id: string;
  src: string;
  alt: string;
  filePublicId?: string;
  path?: string;
};

type SortableImageInputItem = {
  type?: 'existing' | 'new';
  id?: string;
  tempId?: string;
  src?: string;
  alt?: string;
};

@Injectable()
export class SortableImageCacheService {
  private readonly cacheKeyPrefix = 'sortable-images';
  private readonly uploadFolder = 'sortable-images';
  private readonly maxImageSize = 10 * 1024 * 1024;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly storage: FileStorageService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async findAll(ownerKey: string) {
    const images = await this.getCachedImages(ownerKey);

    return {
      ownerKey,
      images: images.map((image, order) => ({ ...image, order })),
    };
  }

  async save(
    ownerKey: string,
    rawItems: unknown,
    files: Express.Multer.File[] = [],
  ) {
    const currentImages = await this.getCachedImages(ownerKey);
    const currentImageById = new Map(
      currentImages.map((image) => [image.id, image]),
    );
    const items = this.parseItems(rawItems, files);
    const nextImages: SortableImageCacheItem[] = [];
    let nextFileIndex = 0;

    for (const item of items) {
      if (item.type === 'existing') {
        if (!item.id) {
          throw new BadRequestException('Existing image item must include id');
        }

        const cachedImage = currentImageById.get(item.id);
        if (!cachedImage && !item.src) {
          throw new BadRequestException(`Image "${item.id}" was not found`);
        }

        nextImages.push(
          await this.createImageFromExistingItem(
            { ...item, id: item.id },
            cachedImage,
          ),
        );
        continue;
      }

      const file = files[nextFileIndex];
      nextFileIndex += 1;

      if (!file) {
        throw new BadRequestException('Missing file for new image item');
      }

      nextImages.push(await this.createImageFromFile(file, item.alt));
    }

    if (nextFileIndex < files.length) {
      const remainingFiles = files.slice(nextFileIndex);
      nextImages.push(
        ...(await Promise.all(
          remainingFiles.map((file) => this.createImageFromFile(file)),
        )),
      );
    }

    await this.cache.set(this.getCacheKey(ownerKey), nextImages);

    return {
      ownerKey,
      images: nextImages.map((image, order) => ({ ...image, order })),
    };
  }

  private getCacheKey(ownerKey: string) {
    return `${this.cacheKeyPrefix}:${ownerKey}`;
  }

  private async getCachedImages(ownerKey: string) {
    const cached = await this.cache.get<SortableImageCacheItem[]>(
      this.getCacheKey(ownerKey),
    );

    return Array.isArray(cached) ? cached : [];
  }

  private parseItems(rawItems: unknown, files: Express.Multer.File[]) {
    if (rawItems === undefined || rawItems === null || rawItems === '') {
      return files.map<SortableImageInputItem>(() => ({ type: 'new' }));
    }

    let parsed: unknown;
    try {
      parsed = typeof rawItems === 'string' ? JSON.parse(rawItems) : rawItems;
    } catch {
      throw new BadRequestException('items must be valid JSON');
    }

    if (!Array.isArray(parsed)) {
      throw new BadRequestException('items must be a JSON array');
    }

    return parsed.map((item) => {
      if (!item || typeof item !== 'object') {
        throw new BadRequestException('Each item must be an object');
      }

      const value = item as SortableImageInputItem;
      return {
        type: value.type ?? (value.id ? 'existing' : 'new'),
        id: value.id,
        tempId: value.tempId,
        src: value.src,
        alt: value.alt,
      };
    });
  }

  private async createImageFromFile(
    file: Express.Multer.File,
    alt = file.originalname,
  ): Promise<SortableImageCacheItem> {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException(`${file.originalname} must be an image`);
    }

    if (file.size > this.maxImageSize) {
      throw new BadRequestException(`${file.originalname} is too large`);
    }

    const publicId = randomUUID().replace(/-/g, '').slice(0, 20);
    const ext = this.getFileExtension(file);
    const path = posixPath.join(
      'image',
      this.uploadFolder,
      `${publicId}.${ext}`,
    );

    await this.storage.disk('public').put(path, file.buffer, {
      ContentType: file.mimetype,
      visibility: 'public',
    });

    return {
      id: publicId,
      src: this.getPublicStorageUrl(path),
      alt,
      filePublicId: publicId,
      path,
    };
  }

  private async createImageFromExistingItem(
    item: SortableImageInputItem & { id: string },
    cachedImage?: SortableImageCacheItem,
  ): Promise<SortableImageCacheItem> {
    const src = cachedImage?.src ?? item.src!;
    const alt = item.alt ?? cachedImage?.alt ?? 'Image';

    if (src.startsWith('data:image/')) {
      return this.createImageFromFile(
        this.createMulterFileFromDataUrl(src, alt),
      );
    }

    return {
      id: item.id,
      src,
      alt,
      filePublicId: cachedImage?.filePublicId,
      path: cachedImage?.path,
    };
  }

  private createMulterFileFromDataUrl(
    src: string,
    filename: string,
  ): Express.Multer.File {
    const match = src.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (!match) {
      throw new BadRequestException('Invalid image data URL');
    }

    const [, mimetype, data] = match;
    const buffer = Buffer.from(data, 'base64');

    return {
      fieldname: 'files',
      originalname: filename,
      encoding: '7bit',
      mimetype,
      size: buffer.length,
      buffer,
    } as Express.Multer.File;
  }

  private getFileExtension(file: Express.Multer.File) {
    const originalExt = file.originalname.split('.').pop();
    if (originalExt && originalExt !== file.originalname) {
      return originalExt.toLowerCase();
    }

    return file.mimetype.split('/').pop() || 'jpg';
  }

  private getPublicStorageUrl(path: string) {
    const appUrl = this.configService.getOrThrow('app.url', { infer: true });

    return `${appUrl.replace(/\/$/, '')}/storage/public/${path.replace(/^\/+/, '')}`;
  }
}
