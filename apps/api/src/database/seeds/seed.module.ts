import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

import appConfig from '@/config/app.config';
import databaseConfig from '@/database/config/database.config';
import { TypeOrmConfigService } from '@/database/typeorm-config.service';
import { AdminSeedModule } from './admin/admin-seed.module';
import { CmsPageSeedModule } from './cms-page/cms-page-seed.module';
import { SettingSeedModule } from './setting/setting-seed.module';
import { UserSeedModule } from './user/user-seed.module';
import { WhiteLabelSeedModule } from './white-label/white-label-seed.module';

@Module({
  imports: [
    UserSeedModule,
    SettingSeedModule,
    WhiteLabelSeedModule,
    AdminSeedModule,
    CmsPageSeedModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options: DataSourceOptions) => {
        return new DataSource(options).initialize();
      },
    }),
  ],
})
export class SeedModule {}
