export type StorageDisk = 'local' | 'public' | 's3';

export interface StorageConfig {
  disk: StorageDisk;
  localRoot: string;
  s3: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    endpoint?: string;
    forcePathStyle?: boolean;
  };
}
