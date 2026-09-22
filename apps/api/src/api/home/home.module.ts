import { QueueName, QueuePrefix } from '@/constants/job.constant';
import { CmsPageSeedModule } from '@/database/seeds/cms-page/cms-page-seed.module';
import { LocationSeedModule } from '@/database/seeds/location/location-seed.module';
import { SettingSeedModule } from '@/database/seeds/setting/setting-seed.module';
import { WhiteLabelSeedModule } from '@/database/seeds/white-label/white-label-seed.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUserModule } from '../admin-user/admin-user.module';
import { PermissionEntity } from '../permission/entities/permission.entity';
import { RoleModule } from '../role/role.module';
import { SettingsModule } from '../settings/settings.module';
import { WhiteLabelModule } from '../white-label/white-label.module';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { SetupController } from './setup.controller';

@Module({
  imports: [
    AdminUserModule,
    RoleModule,
    SettingsModule,
    WhiteLabelModule,
    SettingSeedModule,
    WhiteLabelSeedModule,
    CmsPageSeedModule,
    LocationSeedModule,
    TypeOrmModule.forFeature([PermissionEntity]),
    BullModule.registerQueue({
      name: QueueName.EMAIL,
      prefix: QueuePrefix.AUTH,
      streams: {
        events: {
          maxLen: 1000,
        },
      },
    }),
  ],
  controllers: [HomeController, SetupController],
  providers: [HomeService],
})
export class HomeModule {}
