import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import path from 'node:path';
import process from 'node:process';
import type { AllConfigType } from '../config/config.type';
import { getDiskToken } from './decorators/inject-disk.decorator';
import { FilesystemService } from './filesystem.service';

@Global()
@Module({
  imports: [
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const localRoot =
          configService.get('storage.localRoot', { infer: true }) ?? 'storage';
        const publicStoragePath = path.resolve(
          process.cwd(),
          localRoot,
          'public',
        );
        const publicRootPath = path.resolve(process.cwd(), 'public');

        return [
          {
            rootPath: publicStoragePath,
            serveRoot: `/${localRoot}`,
            serveStaticOptions: {
              index: false,
              fallthrough: true,
            },
          },
          {
            rootPath: publicRootPath,
            serveRoot: '/',
            serveStaticOptions: {
              index: false,
              fallthrough: true,
            },
          },
        ];
      },
    }),
  ],
  providers: [
    FilesystemService,
    {
      provide: getDiskToken('local'),
      useFactory: (filesystemService: FilesystemService) =>
        filesystemService.disk('local'),
      inject: [FilesystemService],
    },
    {
      provide: getDiskToken('public'),
      useFactory: (filesystemService: FilesystemService) =>
        filesystemService.disk('public'),
      inject: [FilesystemService],
    },
    {
      provide: getDiskToken('s3'),
      useFactory: (filesystemService: FilesystemService) =>
        filesystemService.disk('s3'),
      inject: [FilesystemService],
    },
  ],
  exports: [
    FilesystemService,
    getDiskToken('local'),
    getDiskToken('public'),
    getDiskToken('s3'),
  ],
})
export class FilesystemModule {}
