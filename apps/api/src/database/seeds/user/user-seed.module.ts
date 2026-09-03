import { PermissionEntity } from '@/api/permission/entities/permission.entity';
import { RoleEntity } from '@/api/role/entities/role.entity';
import { AccountEntity } from '@/api/user/entities/account.entity';
import { UserProfileEntity } from '@/api/user/entities/user-profile.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSeedService } from './user-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserProfileEntity,
      AccountEntity,
      RoleEntity,
      PermissionEntity,
    ]),
  ],
  providers: [UserSeedService],
  exports: [UserSeedService],
})
export class UserSeedModule {}
