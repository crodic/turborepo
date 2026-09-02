import { RoleEntity } from '@/api/role/entities/role.entity';
import { SettingsModule } from '@/api/settings/settings.module';
import { AccountEntity } from '@/api/user/entities/account.entity';
import { AdminProfileEntity } from '@/api/user/entities/admin-profile.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { QueueName, QueuePrefix } from '@/constants/job.constant';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUserController } from './admin-user.controller';
import { AdminUserService } from './admin-user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      AdminProfileEntity,
      AccountEntity,
      RoleEntity,
    ]),
    JwtModule.register({}),
    SettingsModule,
    BullModule.registerQueue({
      name: QueueName.EMAIL,
      prefix: QueuePrefix.AUTH,
    }),
    BullBoardModule.forFeature({
      name: QueueName.EMAIL,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [AdminUserController],
  providers: [AdminUserService],
  exports: [AdminUserService],
})
export class AdminUserModule {}
