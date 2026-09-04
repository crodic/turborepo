import { QueueName, QueuePrefix } from '@/constants/job.constant';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from '../permission/entities/permission.entity';
import { RoleEntity } from '../role/entities/role.entity';
import { AuthModule } from './../auth/auth.module';
import { AdminUserController } from './admin-user.controller';
import { AdminUserService } from './admin-user.service';
import { AdminAccountEntity } from './entities/admin-account.entity';
import { AdminTwoFactorEntity } from './entities/admin-two-factor.entity';
import { AdminUserEntity } from './entities/admin-user.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      RoleEntity,
      PermissionEntity,
      AdminUserEntity,
      AdminAccountEntity,
      AdminTwoFactorEntity,
    ]),
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
  controllers: [AdminUserController],
  providers: [AdminUserService],
  exports: [AdminUserService],
})
export class AdminUserModule {}
