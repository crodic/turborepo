import { EmailQueueModule } from '@/background/queues/email-queue/email-queue.module';
import { FilesystemModule } from '@/filesystem/filesystem.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from '../role/entities/role.entity';
import { RoleModule } from '../role/role.module';
import { AccountEntity } from './entities/account.entity';
import { AdminProfileEntity } from './entities/admin-profile.entity';
import { UserProfileEntity } from './entities/user-profile.entity';
import { UserEntity } from './entities/user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      AdminProfileEntity,
      UserProfileEntity,
      AccountEntity,
      RoleEntity,
    ]),
    RoleModule,
    FilesystemModule,
    EmailQueueModule,
    JwtModule.register({}),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
