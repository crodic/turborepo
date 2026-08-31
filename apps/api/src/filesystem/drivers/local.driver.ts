import * as mime from 'mime-types';
import { createReadStream, createWriteStream, promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { PutOptions, StorageDriver } from './storage-driver.interface';

export class LocalDriver implements StorageDriver {
  protected readonly basePath: string;

  constructor(root: string, subDir = 'local') {
    this.basePath = path.resolve(process.cwd(), root, subDir);
  }

  protected getFullPath(filePath: string): string {
    const normalized = path
      .normalize(filePath)
      .replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.basePath, normalized);
  }

  protected async ensureDirectoryExists(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  async put(
    filePath: string,
    content: Buffer | Uint8Array | string | Readable,
    _options?: PutOptions,
  ): Promise<string> {
    void _options;
    const fullPath = this.getFullPath(filePath);
    await this.ensureDirectoryExists(fullPath);

    if (content instanceof Readable) {
      const writeStream = createWriteStream(fullPath);
      await pipeline(content, writeStream);
    } else {
      await fs.writeFile(fullPath, content);
    }

    return filePath;
  }

  async get(filePath: string): Promise<Buffer> {
    const fullPath = this.getFullPath(filePath);
    return await fs.readFile(fullPath);
  }

  async getStream(filePath: string): Promise<Readable> {
    const fullPath = this.getFullPath(filePath);
    await fs.access(fullPath);
    return createReadStream(fullPath);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(filePath: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(filePath);
      await fs.unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async deleteDirectory(prefix: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(prefix);
      await fs.rm(fullPath, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }

  async size(filePath: string): Promise<number> {
    const fullPath = this.getFullPath(filePath);
    const stat = await fs.stat(fullPath);
    return stat.size;
  }

  async mimeType(filePath: string): Promise<string> {
    const fullPath = this.getFullPath(filePath);
    await fs.access(fullPath);
    const lookup = mime.lookup(fullPath);
    return typeof lookup === 'string' ? lookup : 'application/octet-stream';
  }

  url(_filePath: string): string {
    void _filePath;
    throw new Error(
      'Local disk is private and does not have a public URL. Use public or s3 disk.',
    );
  }

  async temporaryUrl(
    _filePath: string,
    _expiresInSeconds?: number,
  ): Promise<string> {
    void _filePath;
    void _expiresInSeconds;
    return await Promise.reject(
      new Error(
        'Temporary URLs are not supported directly by the local private disk.',
      ),
    );
  }

  async copy(from: string, to: string): Promise<boolean> {
    try {
      const fromPath = this.getFullPath(from);
      const toPath = this.getFullPath(to);
      await this.ensureDirectoryExists(toPath);
      await fs.copyFile(fromPath, toPath);
      return true;
    } catch {
      return false;
    }
  }

  async move(from: string, to: string): Promise<boolean> {
    try {
      const fromPath = this.getFullPath(from);
      const toPath = this.getFullPath(to);
      await this.ensureDirectoryExists(toPath);
      await fs.rename(fromPath, toPath);
      return true;
    } catch {
      return false;
    }
  }
}
