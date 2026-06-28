import { AllConfigType } from '@/config/config.type';
import { FileStorageService } from '@/libs/filesystem/lib/file-storage.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { posix as posixPath } from 'path';

export type SortableImageStoredItem = {
  id: string;
  src: string;
  alt: string;
  filePublicId?: string;
  path?: string;
};

export type SortableImageInputItem = {
  type?: 'existing' | 'new';
  id?: string;
  tempId?: string;
  src?: string;
  alt?: string;
};

export type BuildSortableImagesOptions = {
  currentImages: SortableImageStoredItem[];
  rawItems: unknown;
  files?: Express.Multer.File[];
  uploadFolder?: string;
  maxImageSize?: number;
};

@Injectable()
export class SortableImageUploadService {
  private readonly defaultUploadFolder = 'sortable-images';
  private readonly defaultMaxImageSize = 10 * 1024 * 1024;

  constructor(
    private readonly storage: FileStorageService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async buildNextImages({
    currentImages,
    rawItems,
    files = [],
    uploadFolder = this.defaultUploadFolder,
    maxImageSize = this.defaultMaxImageSize,
  }: BuildSortableImagesOptions): Promise<SortableImageStoredItem[]> {
    const currentImageById = new Map(
      currentImages.map((image) => [image.id, image]),
    );
    const items = this.parseItems(rawItems, files);
    const nextImages: SortableImageStoredItem[] = [];
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
            {
              uploadFolder,
              maxImageSize,
            },
          ),
        );
        continue;
      }

      const file = files[nextFileIndex];
      nextFileIndex += 1;

      if (!file) {
        throw new BadRequestException('Missing file for new image item');
      }

      nextImages.push(
        await this.createImageFromFile(file, {
          alt: item.alt,
          uploadFolder,
          maxImageSize,
        }),
      );
    }

    if (nextFileIndex < files.length) {
      const remainingFiles = files.slice(nextFileIndex);
      nextImages.push(
        ...(await Promise.all(
          remainingFiles.map((file) =>
            this.createImageFromFile(file, { uploadFolder, maxImageSize }),
          ),
        )),
      );
    }

    return nextImages;
  }

  parseItems(rawItems: unknown, files: Express.Multer.File[]) {
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

  async createImageFromFile(
    file: Express.Multer.File,
    {
      alt = file.originalname,
      uploadFolder = this.defaultUploadFolder,
      maxImageSize = this.defaultMaxImageSize,
    }: {
      alt?: string;
      uploadFolder?: string;
      maxImageSize?: number;
    } = {},
  ): Promise<SortableImageStoredItem> {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException(`${file.originalname} must be an image`);
    }

    if (file.size > maxImageSize) {
      throw new BadRequestException(`${file.originalname} is too large`);
    }

    const publicId = randomUUID().replace(/-/g, '').slice(0, 20);
    const ext = this.getFileExtension(file);
    const path = posixPath.join('image', uploadFolder, `${publicId}.${ext}`);

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
    storedImage: SortableImageStoredItem | undefined,
    options: { uploadFolder: string; maxImageSize: number },
  ): Promise<SortableImageStoredItem> {
    const src = storedImage?.src ?? item.src!;
    const alt = item.alt ?? storedImage?.alt ?? 'Image';

    if (src.startsWith('data:image/')) {
      return this.createImageFromFile(
        this.createMulterFileFromDataUrl(src, alt),
        options,
      );
    }

    return {
      id: item.id,
      src,
      alt,
      filePublicId: storedImage?.filePublicId,
      path: storedImage?.path,
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
