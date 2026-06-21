import { Storage } from '@/constants/app.constant';
import validateConfig from '@/utils/validate-config';
import { registerAs } from '@nestjs/config';
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import process from 'node:process';
import { StorageConfig } from './storage-config.type';

class EnvironmentVariablesValidator {
  @IsEnum(Storage)
  FILESYSTEM_DISK: Storage;

  @IsString()
  @IsOptional()
  AWS_REGION: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  AWS_ENDPOINT: string;

  @IsString()
  @IsOptional()
  AWS_ACCESS_KEY_ID: string;

  @IsString()
  @IsOptional()
  AWS_SECRET_ACCESS_KEY: string;
}

export default registerAs<StorageConfig>('storage', () => {
  console.info(`Register StorageConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    fileSystemDisk: (process.env.FILESYSTEM_DISK as Storage) || Storage.PUBLIC,
    awsRegion: process.env.AWS_REGION,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    awsBucket: process.env.AWS_BUCKET,
    awsEndpoint: process.env.AWS_ENDPOINT,
  };
});
