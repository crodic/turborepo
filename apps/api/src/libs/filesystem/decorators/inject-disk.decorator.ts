import { Inject } from '@nestjs/common';

/**
 * Injects a disk from the file storage service.
 * @param diskName - The name of the disk to inject.
 * @example
 * @InjectDisk('local')
 * private readonly fileStorageService: FileStorageService,
 * @InjectDisk('s3')
 * private readonly fileStorageService: FileStorageService,
 * private readonly fileStorageService: FileStorageService,
 * @returns The disk from the file storage service.
 */
export function InjectDisk<T extends string>(diskName: T) {
  return Inject(`FILE_STORAGE_DISK_${diskName.toUpperCase()}`);
}
