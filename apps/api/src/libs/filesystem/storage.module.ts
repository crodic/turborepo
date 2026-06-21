import { AllConfigType } from '@/config/config.type';
import { FileStorageModule } from '@/libs/filesystem/lib/file-storage.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    FileStorageModule.forRootAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        default: config.getOrThrow<AllConfigType>('storage.fileSystemDisk', {
          infer: true,
        }),
        disks: {
          local: {
            driver: 'local',
            root: `storage/private`,
            basePublicUrl: config.getOrThrow<AllConfigType>('app.url', {
              infer: true,
            }),
          },
          public: {
            driver: 'local',
            root: 'storage/public',
            basePublicUrl: config.getOrThrow<AllConfigType>('app.url', {
              infer: true,
            }),
          },
          s3: {
            driver: 's3',
            region: config.getOrThrow<AllConfigType>('storage.awsRegion', {
              infer: true,
            }),
            endpoint: config.getOrThrow<AllConfigType>('storage.awsEndpoint', {
              infer: true,
            }),
            accessKeyId: config.getOrThrow<AllConfigType>(
              'storage.awsAccessKeyId',
              {
                infer: true,
              },
            ),
            secretAccessKey: config.getOrThrow<AllConfigType>(
              'storage.awsSecretAccessKey',
              {
                infer: true,
              },
            ),
            bucket: config.getOrThrow<AllConfigType>('storage.awsBucket', {
              infer: true,
            }),
            forcePathStyle: true,
          },
        },
      }),
      injectables: ['local', 'public', 's3'],
    }),
  ],
})
export class StorageModule {}
