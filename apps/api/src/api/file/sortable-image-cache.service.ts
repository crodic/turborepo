import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import {
  SortableImageStoredItem,
  SortableImageUploadService,
} from './sortable-image-upload.service';

@Injectable()
export class SortableImageCacheService {
  private readonly cacheKeyPrefix = 'sortable-images';

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly sortableImageUploadService: SortableImageUploadService,
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
    const nextImages = await this.sortableImageUploadService.buildNextImages({
      currentImages: await this.getCachedImages(ownerKey),
      rawItems,
      files,
    });

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
    const cached = await this.cache.get<SortableImageStoredItem[]>(
      this.getCacheKey(ownerKey),
    );

    return Array.isArray(cached) ? cached : [];
  }
}
