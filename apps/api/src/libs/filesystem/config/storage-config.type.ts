import { Storage } from '@/constants/app.constant';

export type StorageConfig = {
  fileSystemDisk: Storage;

  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsBucket?: string;
  awsEndpoint?: string;
};
