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
  getStream: (path: string) => Promise<Readable>;

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
