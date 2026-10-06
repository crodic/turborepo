export type StorageDisk = 'local' | 'public' | 's3' | 's3-private';

export interface DiskDefinition {
  driver: 'local' | 's3';
  visibility: 'public' | 'private';
  root?: string;
  bucket?: string;
  url?: string;
}

export interface S3StorageOptions {
  accessKeyId?: string;
  secretAccessKey?: string;
  region: string;
  bucket: string;
  privateBucket?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  url?: string;
}

export interface StorageConfig {
  disk: StorageDisk;
  localRoot: string;
  s3: S3StorageOptions;
  disks: Record<StorageDisk, DiskDefinition>;
}
