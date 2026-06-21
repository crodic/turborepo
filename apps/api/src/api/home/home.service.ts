import { PermissionEntity } from '@/api/permission/entities/permission.entity';
import { permissionCatalogRows } from '@/api/permission/permission-sync';
import { SYSTEM_ROLE_NAME } from '@/constants/app.constant';
import { ADMIN_FULL_ACCESS } from '@/utils/permissions.constant';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminUserService } from '../admin-user/admin-user.service';
import { RoleService } from '../role/role.service';
import { CreateSystemSetupReqDto } from './dto/create-system-setup.req.dto';

@Injectable()
export class HomeService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly adminUserService: AdminUserService,
    private readonly roleService: RoleService,
  ) {}

  async initialStatus() {
    const [hasAdmin, hasRole] = await Promise.all([
      this.adminUserService.hasAdmin(),
      this.roleService.hasRole(),
    ]);

    const initialized = hasAdmin && hasRole;

    return {
      initialized,
      message: initialized
        ? 'System has been initialized'
        : 'System has not been initialized',
    };
  }

  async systemSetup(dto: CreateSystemSetupReqDto) {
    const [hasAdmin, hasRole] = await Promise.all([
      this.adminUserService.hasAdmin(),
      this.roleService.hasRole(),
    ]);

    if (hasAdmin || hasRole) {
      throw new HttpException(
        'System has already been initialized',
        HttpStatus.FORBIDDEN,
      );
    }

    const { email, password, systemRoleName } = dto;

    return await this.dataSource.transaction(async (manager) => {
      const permissionRepo = manager.getRepository(PermissionEntity);
      const permissionKey = `${ADMIN_FULL_ACCESS.action}:${ADMIN_FULL_ACCESS.subject}`;
      let permission = await permissionRepo.findOne({
        where: { key: permissionKey },
      });

      if (!permission) {
        const permissionMeta = permissionCatalogRows().find(
          (item) => item.key === permissionKey,
        );
        permission = await permissionRepo.save(
          permissionRepo.create({
            name: permissionMeta?.name ?? permissionKey,
            group: permissionMeta?.group ?? 'System',
            description: permissionMeta?.description,
            key: permissionKey,
          }),
        );
      }

      const role = await this.roleService.createWithManager(manager, {
        name: systemRoleName ?? SYSTEM_ROLE_NAME,
        permissionIds: [permission.id],
        description: 'System role',
        isSystem: true,
      });

      await this.adminUserService.createWithManager(manager, {
        firstName: 'System',
        lastName: 'Administrator',
        email,
        password,
        roleIds: [role.id],
      });

      return { success: true, message: 'System initialized successfully' };
    });
  }
}
