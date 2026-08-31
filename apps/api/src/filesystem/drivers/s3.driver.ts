import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as mime from 'mime-types';
import { Readable } from 'node:stream';
import type { StorageConfig } from '../config/storage-config.type';
import type { PutOptions, StorageDriver } from './storage-driver.interface';

export class S3Driver implements StorageDriver {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint?: string;
  private readonly forcePathStyle: boolean;

  constructor(config: StorageConfig['s3']) {
    this.bucket = config.bucket;
    this.region = config.region;
    this.endpoint = config.endpoint;
    this.forcePathStyle = config.forcePathStyle ?? false;

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: this.endpoint,
      forcePathStyle: this.forcePathStyle,
    });
  }

  private normalizeKey(key: string): string {
    return key.replace(/\\/g, '/').replace(/^\/+/, '');
  }

  async put(
    filePath: string,
    content: Buffer | Uint8Array | string | Readable,
    options?: PutOptions,
  ): Promise<string> {
    const key = this.normalizeKey(filePath);
    const mimeLookup = mime.lookup(key);
    const contentType =
      options?.mimeType ??
      (typeof mimeLookup === 'string'
        ? mimeLookup
        : 'application/octet-stream');

    let body: Buffer | Uint8Array | string | Readable;

    if (content instanceof Readable) {
      const chunks: Buffer[] = [];
      for await (const chunk of content) {
        chunks.push(
          Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array),
        );
      }
      body = Buffer.concat(chunks);
    } else {
      body = content;
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType:
        typeof contentType === 'string'
          ? contentType
          : 'application/octet-stream',
    });

    await this.client.send(command);
    return key;
  }

  async get(filePath: string): Promise<Buffer> {
    const key = this.normalizeKey(filePath);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`File ${key} has empty body.`);
    }

    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  async getStream(filePath: string): Promise<Readable> {
    const key = this.normalizeKey(filePath);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`File ${key} has empty body.`);
    }

    return response.Body as unknown as Readable;
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const key = this.normalizeKey(filePath);
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async delete(filePath: string): Promise<boolean> {
    try {
      const key = this.normalizeKey(filePath);
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async deleteDirectory(prefix: string): Promise<boolean> {
    try {
      const normalizedPrefix = this.normalizeKey(prefix).replace(/\/*$/, '/');
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: normalizedPrefix,
      });

      const listResponse = await this.client.send(listCommand);
      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        return true;
      }

      const objectsToDelete = listResponse.Contents.map((item) => ({
        Key: item.Key,
      }));

      const deleteCommand = new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: objectsToDelete },
      });

      await this.client.send(deleteCommand);
      return true;
    } catch {
      return false;
    }
  }

  async size(filePath: string): Promise<number> {
    const key = this.normalizeKey(filePath);
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    return response.ContentLength ?? 0;
  }

  async mimeType(filePath: string): Promise<string> {
    const key = this.normalizeKey(filePath);
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      const response = await this.client.send(command);
      if (response.ContentType) {
        return response.ContentType;
      }
    } catch {
      // Fallback to local extension lookup
    }

    const lookup = mime.lookup(key);
    return typeof lookup === 'string' ? lookup : 'application/octet-stream';
  }

  url(filePath: string): string {
    const key = this.normalizeKey(filePath);
    if (this.endpoint) {
      const endpointTrimmed = this.endpoint.replace(/\/+$/, '');
      return `${endpointTrimmed}/${this.bucket}/${key}`;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async temporaryUrl(
    filePath: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const key = this.normalizeKey(filePath);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  async copy(from: string, to: string): Promise<boolean> {
    try {
      const sourceKey = this.normalizeKey(from);
      const targetKey = this.normalizeKey(to);

      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: targetKey,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async move(from: string, to: string): Promise<boolean> {
    const copied = await this.copy(from, to);
    if (copied) {
      await this.delete(from);
      return true;
    }
    return false;
  }
}
