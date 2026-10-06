import type { Readable } from 'node:stream';

export interface PutOptions {
  mimeType?: string;
  visibility?: 'public' | 'private';
}

export interface StorageDriver {
  /**
   * Write content to a file.
   * @param path Relative path inside the disk
   * @param content File content (Buffer, Uint8Array, string, or Readable stream)
   * @param options Optional settings like mimeType or visibility
   * @returns Path of the saved file
   */
  put: (
    path: string,
    content: Buffer | Uint8Array | string | Readable,
    options?: PutOptions,
  ) => Promise<string>;

  /**
   * Read file content as Buffer.
   */
  get: (path: string) => Promise<Buffer>;

  /**
   * Read file content as a Readable Stream (ideal for large files).
   */
  getStream: (
    path: string,
    options?: { start?: number; end?: number },
  ) => Promise<Readable>;

  /**
   * Check if a file exists.
   */
  exists: (path: string) => Promise<boolean>;

  /**
   * Delete a single file.
   */
  delete: (path: string) => Promise<boolean>;

  /**
   * Delete an entire directory / prefix.
   */
  deleteDirectory: (prefix: string) => Promise<boolean>;

  /**
   * Get size of a file in bytes.
   */
  size: (path: string) => Promise<number>;

  /**
   * Get MIME type of a file.
   */
  mimeType: (path: string) => Promise<string>;

  /**
   * Get public URL for a file.
   */
  url: (path: string) => string;

  /**
   * Generate a temporary presigned URL for private file access.
   * @param path Relative path
   * @param expiresInSeconds Expiration time in seconds (e.g. 3600)
   */
  temporaryUrl: (path: string, expiresInSeconds: number) => Promise<string>;

  /**
   * Copy a file to a new location.
   */
  copy: (from: string, to: string) => Promise<boolean>;

  /**
   * Move / Rename a file.
   */
  move: (from: string, to: string) => Promise<boolean>;
}

export interface MultipartPartInput {
  partNumber: number;
  etag: string;
}

export interface MultipartCapable {
  createMultipartUpload: (
    filePath: string,
    options?: PutOptions,
  ) => Promise<{ uploadId: string; key: string }>;

  uploadPart: (
    filePath: string,
    uploadId: string,
    partNumber: number,
    content: Buffer | Uint8Array,
  ) => Promise<{ etag: string; partNumber: number }>;

  completeMultipartUpload: (
    filePath: string,
    uploadId: string,
    parts: MultipartPartInput[],
  ) => Promise<string>;

  abortMultipartUpload: (
    filePath: string,
    uploadId: string,
  ) => Promise<boolean>;
}

export function isMultipartCapable(
  driver: unknown,
): driver is MultipartCapable {
  return (
    typeof driver === 'object' &&
    driver !== null &&
    typeof (driver as any).createMultipartUpload === 'function' &&
    typeof (driver as any).uploadPart === 'function' &&
    typeof (driver as any).completeMultipartUpload === 'function' &&
    typeof (driver as any).abortMultipartUpload === 'function'
  );
}
