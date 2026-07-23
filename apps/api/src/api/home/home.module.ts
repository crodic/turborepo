import { QueueName, QueuePrefix } from '@/constants/job.constant';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUserModule } from '../admin-user/admin-user.module';
import { PermissionEntity } from '../permission/entities/permission.entity';
import { RoleModule } from '../role/role.module';
import { SettingsModule } from '../settings/settings.module';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

@Module({
  imports: [
    AdminUserModule,
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
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
