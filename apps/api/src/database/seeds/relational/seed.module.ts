import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

import appConfig from '../../../config/app.config';
import databaseConfig from '../../config/database.config';
import { TypeOrmConfigService } from '../../typeorm-config.service';
import { AdminSeedModule } from './admin/admin-seed.module';
import { CmsPageSeedModule } from './cms-page/cms-page-seed.module';
import { SettingSeedModule } from './setting/setting-seed.module';
import { ThemeSeedModule } from './theme/theme-seed.module';
import { UserSeedModule } from './user/user-seed.module';

@Module({
  imports: [
    UserSeedModule,
    SettingSeedModule,
    ThemeSeedModule,
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
