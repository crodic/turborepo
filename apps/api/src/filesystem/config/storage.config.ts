import { registerAs } from '@nestjs/config';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import process from 'node:process';
import validateConfig from '../../utils/validate-config';
import type { StorageConfig, StorageDisk } from './storage-config.type';

enum StorageDiskEnum {
  LOCAL = 'local',
  PUBLIC = 'public',
  S3 = 's3',
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
  AWS_ENDPOINT?: string;

  @IsString()
  @IsOptional()
  AWS_USE_PATH_STYLE_ENDPOINT?: string;
}

export default registerAs<StorageConfig>('storage', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  const disk =
    (process.env.FILESYSTEM_DISK as StorageDisk | undefined) ?? 'public';
  const localRoot = process.env.FILESYSTEM_LOCAL_ROOT ?? 'storage';

  return {
    disk,
    localRoot,
    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      region: process.env.AWS_REGION ?? 'us-east-1',
      bucket: process.env.AWS_BUCKET ?? 'nest-uploads',
      endpoint: process.env.AWS_ENDPOINT,
      forcePathStyle: process.env.AWS_USE_PATH_STYLE_ENDPOINT === 'true',
    },
  };
});
