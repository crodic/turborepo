import { PermissionEntity } from '@/api/permission/entities/permission.entity';
import { RoleEntity } from '@/api/role/entities/role.entity';
import { AccountEntity } from '@/api/user/entities/account.entity';
import { AdminProfileEntity } from '@/api/user/entities/admin-profile.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSeedService } from './admin-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      AdminProfileEntity,
      AccountEntity,
      PermissionEntity,
      RoleEntity,
    ]),
  ],
  providers: [AdminSeedService],
  exports: [AdminSeedService],
})
export class AdminSeedModule {}
