import { registerAs } from '@nestjs/config';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import process from 'node:process';
import validateConfig from '../../utils/validate-config';
import type { StorageConfig, StorageDisk } from './storage-config.type';

enum StorageDiskEnum {
  LOCAL = 'local',
  PUBLIC = 'public',
  S3 = 's3',
  S3_PRIVATE = 's3-private',
}

class EnvironmentVariablesValidator {
  @IsEnum(StorageDiskEnum)
  @IsOptional()
  FILESYSTEM_DISK?: StorageDisk;

  @IsString()
  @IsOptional()
  FILESYSTEM_LOCAL_ROOT?: string;

  @IsString()
  @IsOptional()
  AWS_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  AWS_SECRET_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  AWS_REGION?: string;

  @IsString()
  @IsOptional()
  AWS_BUCKET?: string;

  @IsString()
  @IsOptional()
  AWS_PRIVATE_BUCKET?: string;

  @IsString()
  @IsOptional()
  AWS_ENDPOINT?: string;

  @IsString()
  @IsOptional()
  AWS_USE_PATH_STYLE_ENDPOINT?: string;

  @IsString()
  @IsOptional()
  AWS_URL?: string;
}

export default registerAs<StorageConfig>('storage', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  const disk =
    (process.env.FILESYSTEM_DISK as StorageDisk | undefined) ?? 'public';
  const localRoot = process.env.FILESYSTEM_LOCAL_ROOT ?? 'storage';
  const appUrl = process.env.APP_URL ?? 'http://localhost:8000';
  const bucket = process.env.AWS_BUCKET ?? 'nest-uploads';
  const privateBucket = process.env.AWS_PRIVATE_BUCKET ?? `${bucket}-private`;
  const awsUrl = process.env.AWS_URL;

  const s3Config = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    region: process.env.AWS_REGION ?? 'us-east-1',
    bucket,
    privateBucket,
    endpoint: process.env.AWS_ENDPOINT,
    forcePathStyle: process.env.AWS_USE_PATH_STYLE_ENDPOINT === 'true',
    url: awsUrl,
  };

  const cleanAppUrl = appUrl.replace(/\/+$/, '');
  const cleanLocalRoot = localRoot.replace(/^\/+|\/+$/g, '');

  return {
    disk,
    localRoot,
    s3: s3Config,
    disks: {
      local: {
        driver: 'local',
        root: `${localRoot}/local`,
        visibility: 'private',
      },
      public: {
        driver: 'local',
        root: `${localRoot}/public`,
        visibility: 'public',
        url: `${cleanAppUrl}/${cleanLocalRoot}`,
      },
      s3: {
        driver: 's3',
        bucket,
        visibility: 'public',
        url: awsUrl,
      },
      's3-private': {
        driver: 's3',
        bucket: privateBucket,
        visibility: 'private',
      },
    },
  };
});
