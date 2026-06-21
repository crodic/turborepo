import { QueueName, QueuePrefix } from '@/constants/job.constant';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUserService } from '../admin-user/admin-user.service';
import { AdminUserEntity } from '../admin-user/entities/admin-user.entity';
import { PermissionEntity } from '../permission/entities/permission.entity';
import { RoleEntity } from '../role/entities/role.entity';
import { RoleService } from '../role/role.service';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, PermissionEntity, AdminUserEntity]),
    JwtModule.register({}),
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
  providers: [RoleService, AdminUserService, HomeService],
})
export class HomeModule {}
