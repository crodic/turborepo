import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { PermissionEntity } from '@/api/permission/entities/permission.entity';
import { syncPermissions } from '@/api/permission/permission-sync';
import { RoleEntity } from '@/api/role/entities/role.entity';
import {
  SUPER_ADMIN_ACCOUNT,
  SYSTEM_ROLE_NAME,
} from '@/constants/app.constant';
import { ADMIN_FULL_ACCESS } from '@/utils/permissions.constant';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

@Injectable()
export class AdminSeedService {
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async run(): Promise<void> {
    await syncPermissions(this.permissionRepository);

    const permissions = await this.permissionRepository.findBy({
      key: In([`${ADMIN_FULL_ACCESS.action}:${ADMIN_FULL_ACCESS.subject}`]),
    });

    let superAdminRole = await this.roleRepository.findOne({
      where: { name: SYSTEM_ROLE_NAME },
      relations: ['permissionEntities'],
    });

    if (!superAdminRole) {
      superAdminRole = this.roleRepository.create({
        name: SYSTEM_ROLE_NAME,
        description: 'System role',
        isSystem: true,
        permissionEntities: permissions,
      });
    } else {
      superAdminRole.isSystem = true;
      superAdminRole.permissionEntities = permissions;
    }

    superAdminRole = await this.roleRepository.save(superAdminRole);

    const existingAdmin = await this.adminUserRepository.findOne({
      where: { email: SUPER_ADMIN_ACCOUNT.email },
      withDeleted: true,
    });

    if (existingAdmin) {
      return;
    }

    await this.adminUserRepository.save(
      this.adminUserRepository.create({
        email: SUPER_ADMIN_ACCOUNT.email,
        firstName: 'System',
        lastName: 'Administrator',
        password: SUPER_ADMIN_ACCOUNT.password,
        roles: [superAdminRole],
        verifiedAt: new Date(),
      }),
    );
  }
}
