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
  private readonly defaultDiskName: StorageDisk;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    this.defaultDiskName =
      this.configService.get('storage.disk', { infer: true }) ?? 'public';
  }

  /**
   * Get a specific disk driver instance by name ('local' | 'public' | 's3').
   * If name is omitted, returns the default disk configured in .env.
   */
  disk(name?: StorageDisk): StorageDriver {
    const diskName = name ?? this.defaultDiskName;

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
      'http://localhost:3000';

    switch (diskName) {
      case 'local':
        return new LocalDriver(localRoot, 'local');
      case 'public':
        return new PublicDriver(localRoot, appUrl);
      case 's3': {
        const s3Config = this.configService.getOrThrow('storage.s3', {
          infer: true,
        });
        return new S3Driver(s3Config);
      }
    }
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

  async getStream(path: string): Promise<Readable> {
    return await this.disk().getStream(path);
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
