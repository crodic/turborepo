import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { PermissionEntity } from '@/api/permission/entities/permission.entity';
import { RoleEntity } from '@/api/role/entities/role.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSeedService } from './admin-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUserEntity, PermissionEntity, RoleEntity]),
  ],
  providers: [AdminSeedService],
  exports: [AdminSeedService],
})
export class AdminSeedModule {}
