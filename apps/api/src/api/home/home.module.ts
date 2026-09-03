import { QueueName, QueuePrefix } from '@/constants/job.constant';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from '../permission/entities/permission.entity';
import { RoleModule } from '../role/role.module';
import { SettingsModule } from '../settings/settings.module';
import { UserModule } from '../user/user.module';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { SetupController } from './setup.controller';

@Module({
  imports: [
    UserModule,
    RoleModule,
    SettingsModule,
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
