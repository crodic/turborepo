import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import {
  SortableImageStoredItem,
  SortableImageUploadService,
} from './sortable-image-upload.service';

type SortableImageCacheState = {
  images: SortableImageStoredItem[];
  coverIndex: number | null;
};

@Injectable()
export class SortableImageCacheService {
  private readonly cacheKeyPrefix = 'sortable-images';

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly sortableImageUploadService: SortableImageUploadService,
  ) {}

  async findAll(ownerKey: string) {
    const state = await this.getCachedState(ownerKey);

    return {
      ownerKey,
      coverIndex: state.coverIndex,
      images: state.images.map((image, order) => ({ ...image, order })),
    };
  }

  async save(
    ownerKey: string,
    rawItems: unknown,
    files: Express.Multer.File[] = [],
    rawCoverIndex?: unknown,
  ) {
    const currentState = await this.getCachedState(ownerKey);
    const nextImages = await this.sortableImageUploadService.buildNextImages({
      currentImages: currentState.images,
      rawItems,
      files,
    });
    const coverIndex = this.normalizeCoverIndex(
      rawCoverIndex ?? currentState.coverIndex,
      nextImages.length,
    );

    await this.cache.set(this.getCacheKey(ownerKey), {
      images: nextImages,
      coverIndex,
    } satisfies SortableImageCacheState);

    return {
      ownerKey,
      coverIndex,
      images: nextImages.map((image, order) => ({ ...image, order })),
    };
  }

  private getCacheKey(ownerKey: string) {
    return `${this.cacheKeyPrefix}:${ownerKey}`;
  }

  private async getCachedState(
    ownerKey: string,
  ): Promise<SortableImageCacheState> {
    const cached = await this.cache.get<
      SortableImageStoredItem[] | SortableImageCacheState
    >(this.getCacheKey(ownerKey));

    if (Array.isArray(cached)) {
      return {
        images: cached,
        coverIndex: cached.length > 0 ? 0 : null,
      };
    }

    if (cached && Array.isArray(cached.images)) {
      return {
        images: cached.images,
        coverIndex: this.normalizeCoverIndex(
          cached.coverIndex,
          cached.images.length,
        ),
      };
    }

    return {
      images: [],
      coverIndex: null,
    };
  }

  private normalizeCoverIndex(rawCoverIndex: unknown, imagesLength: number) {
    if (imagesLength === 0) {
      return null;
    }

    const coverIndex =
      typeof rawCoverIndex === 'string' ? Number(rawCoverIndex) : rawCoverIndex;

    if (
      typeof coverIndex === 'number' &&
      Number.isInteger(coverIndex) &&
      coverIndex >= 0 &&
      coverIndex < imagesLength
    ) {
      return coverIndex;
    }

    return 0;
  }
}
