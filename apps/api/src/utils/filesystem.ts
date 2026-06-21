import { ImageFormat } from '@/api/file/types/upload.types';
import { Storage } from '@/constants/app.constant';
import 'dotenv/config';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

/**
 * Deletes a file from the given relative path.
 * If the file is not found, it will return false.
 * If there is an error deleting the file, it will return false.
 * If the file is successfully deleted, it will return true.
 * @param {string} relativePath - The relative path to the file.
 * @returns {Promise<boolean>} Whether the file was successfully deleted.
 */
export async function deleteFile(relativePath: string): Promise<boolean> {
  try {
    const absolutePath = join(process.cwd(), relativePath);

    if (!existsSync(absolutePath)) {
      console.warn(`File not found: ${absolutePath}`);
      return false;
    }

    await unlink(absolutePath);
    console.log(`File deleted: ${absolutePath}`);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Returns the full path for the given asset path in the given storage.
 * @param {Omit<Storage, 's3'>} disk - The storage to use.
 * @param {string} [path] - The path to the asset.
 * @returns {string} The full path for the asset.
 */
export function fullDiskPath(disk: Omit<Storage, 's3'>, path: string): string {
  return disk === 'local'
    ? join(process.cwd(), 'storage', 'private', path)
    : join(process.cwd(), 'storage', 'public', path);
}

/**
 * Return the full URL for the given asset path.
 * @param {string} path - The path to the asset.
 * @returns {string} The full URL for the asset.
 */
export function asset(path: string): string {
  return `${process.env.APP_URL}/storage/public/${path}`;
}

/**
 * Returns the relative path for the given storage.
 * @param {Omit<Storage, 's3'>} disk - The storage to use.
 * @returns {string} The relative path for the given storage.
 */
export function relativeDiskPath(disk: Omit<Storage, 's3'>): string {
  switch (disk) {
    case Storage.LOCAL:
      return join('storage', 'private');
    case Storage.PUBLIC:
      return join('storage', 'public');
  }
}

/**
 * Returns the relative path for the given asset path in the given storage.
 * @param {Omit<Storage, 's3'>} disk - The storage to use.
 * @param {string} path - The path to the asset.
 * @returns {string} The relative path for the asset.
 */
export function storagePath(disk: Omit<Storage, 's3'>, path: string): string {
  return disk === 'local'
    ? join('storage', 'private', path)
    : join('storage', 'public', path);
}

/**
 * Removes the disk path prefix from a given path.
 * The prefix is either 'storage/public/' or 'storage/private/'.
 * If the path does not start with one of the prefixes, the original path is returned.
 * @param {string} path - The path to remove the prefix from.
 * @returns {string} The path with the prefix removed.
 */
export function removeDiskPath(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const prefixes = ['storage/public/', 'storage/private/'];

  const prefix = prefixes.find((p) => normalized.startsWith(p));
  return prefix ? normalized.slice(prefix.length) : normalized;
}

/**
 * Extracts the image format from a given MIME type.
 * @param {string} mime - The MIME type to extract the format from.
 * @returns {ImageFormat} The extracted image format.
 */
export function extractExt(mime: string): ImageFormat {
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpeg';
  return 'webp';
}

/**
 * Applies the given format and quality to the given Sharp image.
 * @param {sharp.Sharp} img - The Sharp image to apply the format to.
 * @param {ImageFormat} format - The format to apply to the image.
 * @param {number} quality - The quality to apply to the image.
 * @returns {sharp.Sharp} The formatted image.
 */
export function applyFormat(
  img: sharp.Sharp,
  format: ImageFormat,
  quality: number,
): sharp.Sharp {
  switch (format) {
    case 'webp':
      return img.webp({ quality });
    case 'jpeg':
      return img.jpeg({ quality });
    case 'png':
      return img.png({ compressionLevel: quality >= 90 ? 1 : 9 });
    default:
      return img;
  }
}
