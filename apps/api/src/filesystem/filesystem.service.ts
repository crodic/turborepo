import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Readable } from 'node:stream';
import type { AllConfigType } from '../config/config.type';
import type { StorageDisk } from './config/storage-config.type';
import { LocalDriver } from './drivers/local.driver';
import { PublicDriver } from './drivers/public.driver';
import { S3Driver } from './drivers/s3.driver';
import type {
  PutOptions,
  StorageDriver,
} from './drivers/storage-driver.interface';

@Injectable()
export class FilesystemService {
  private readonly drivers = new Map<StorageDisk, StorageDriver>();
  private readonly defaultDiskNameValue: StorageDisk;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    this.defaultDiskNameValue =
      this.configService.get('storage.disk', { infer: true }) ?? 'public';
  }

  get defaultDiskName(): StorageDisk {
    return this.defaultDiskNameValue;
  }

  hasDisk(name?: string | null): boolean {
    if (!name) return false;
    const disks = this.configService.get('storage.disks', { infer: true });
    if (disks && disks[name as StorageDisk]) {
      return true;
    }
    return ['local', 'public', 's3', 's3-private'].includes(name);
  }

  isPrivate(diskName?: string | null): boolean {
    const target = (diskName as StorageDisk) || this.defaultDiskNameValue;
    const disks = this.configService.get('storage.disks', { infer: true });
    if (disks?.[target]?.visibility) {
      return disks[target].visibility === 'private';
    }
    return target === 'local' || target === 's3-private';
  }

  getAvailableDisks(): Array<{
    name: StorageDisk;
    visibility: 'public' | 'private';
    driver: string;
  }> {
    const disks = this.configService.get('storage.disks', { infer: true });
    if (disks) {
      return Object.entries(disks).map(([name, def]) => ({
        name: name as StorageDisk,
        visibility: def.visibility,
        driver: def.driver,
      }));
    }

    return [
      { name: 'local', visibility: 'private', driver: 'local' },
      { name: 'public', visibility: 'public', driver: 'local' },
      { name: 's3', visibility: 'public', driver: 's3' },
      { name: 's3-private', visibility: 'private', driver: 's3' },
    ];
  }

  /**
   * Get a specific disk driver instance by name ('local' | 'public' | 's3' | 's3-private').
   * If name is omitted, returns the default disk configured in .env.
   */
  disk(name?: StorageDisk): StorageDriver {
    const diskName = name ?? this.defaultDiskNameValue;

    const existing = this.drivers.get(diskName);
    if (existing) {
      return existing;
    }

    const created = this.createDriver(diskName);
    this.drivers.set(diskName, created);
    return created;
  }

  private createDriver(diskName: StorageDisk): StorageDriver {
    const localRoot =
      this.configService.get('storage.localRoot', { infer: true }) ?? 'storage';
    const appUrl =
      this.configService.get('app.url', { infer: true }) ??
      'http://localhost:8000';
    const disks = this.configService.get('storage.disks', { infer: true });
    const diskDef = disks?.[diskName];

    const driverType =
      diskDef?.driver ?? (diskName.startsWith('s3') ? 's3' : 'local');
    const visibility =
      diskDef?.visibility ??
      (diskName === 'public' || diskName === 's3' ? 'public' : 'private');

    if (driverType === 'local') {
      if (visibility === 'public') {
        return new PublicDriver(localRoot, appUrl);
      }
      return new LocalDriver(localRoot, 'local');
    }

    if (driverType === 's3') {
      const s3Config = this.configService.getOrThrow('storage.s3', {
        infer: true,
      });

      const bucket =
        diskDef?.bucket ??
        (diskName === 's3-private'
          ? (s3Config.privateBucket ?? `${s3Config.bucket}-private`)
          : s3Config.bucket);

      return new S3Driver({
        ...s3Config,
        bucket,
        url: diskDef?.url ?? (diskName === 's3' ? s3Config.url : undefined),
        visibility,
      });
    }

    throw new Error(`Unsupported storage driver: ${driverType}`);
  }

  // Facade methods delegating to the default disk

  async put(
    path: string,
    content: Buffer | Uint8Array | string | Readable,
    options?: PutOptions,
  ): Promise<string> {
    return await this.disk().put(path, content, options);
  }

  async get(path: string): Promise<Buffer> {
    return await this.disk().get(path);
  }

  async getStream(
    path: string,
    options?: { start?: number; end?: number },
  ): Promise<Readable> {
    return await this.disk().getStream(path, options);
  }

  async exists(path: string): Promise<boolean> {
    return await this.disk().exists(path);
  }

  async delete(path: string): Promise<boolean> {
    return await this.disk().delete(path);
  }

  async deleteDirectory(prefix: string): Promise<boolean> {
    return await this.disk().deleteDirectory(prefix);
  }

  async size(path: string): Promise<number> {
    return await this.disk().size(path);
  }

  async mimeType(path: string): Promise<string> {
    return await this.disk().mimeType(path);
  }

  url(path: string): string {
    return this.disk().url(path);
  }

  async temporaryUrl(path: string, expiresInSeconds: number): Promise<string> {
    return await this.disk().temporaryUrl(path, expiresInSeconds);
  }

  async copy(from: string, to: string): Promise<boolean> {
    return await this.disk().copy(from, to);
  }

  async move(from: string, to: string): Promise<boolean> {
    return await this.disk().move(from, to);
  }
}
