import { Inject } from '@nestjs/common';
import type { StorageDisk } from '../config/storage-config.type';

export const getDiskToken = (diskName: StorageDisk): string =>
  `STORAGE_DISK_${diskName.toUpperCase()}`;

/**
 * Parameter decorator to inject a specific StorageDriver token.
 */
export function InjectDisk(diskName: StorageDisk = 'public') {
  return Inject(getDiskToken(diskName));
}
