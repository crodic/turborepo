import { PermissionEntity } from '@/api/permission/entities/permission.entity';
import { syncPermissions } from '@/api/permission/permission-sync';
import { SettingKeys } from '@/api/settings/enums/setting-keys';
import { SettingsService } from '@/api/settings/settings.service';
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
    private readonly settingsService: SettingsService,
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

    const { email, password, systemRoleName, firstName, lastName, site_brand } =
      dto;

    return await this.dataSource.transaction(async (manager) => {
      const permissionRepo = manager.getRepository(PermissionEntity);
      const permissionKey = `${ADMIN_FULL_ACCESS.action}:${ADMIN_FULL_ACCESS.subject}`;

      // Sync all permissions
      await syncPermissions(permissionRepo);

      const permission = await permissionRepo.findOne({
        where: { key: permissionKey },
      });

      if (!permission) {
        throw new HttpException(
          'System permission missing after sync',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const role = await this.roleService.createWithManager(manager, {
        name: systemRoleName ?? SYSTEM_ROLE_NAME,
        permissionIds: [permission.id],
        description: 'System role',
        isSystem: true,
      });

      await this.adminUserService.createWithManager(manager, {
        firstName: firstName ?? 'System',
        lastName: lastName ?? 'Administrator',
        email,
        password,
        roleIds: [role.id],
      });

      if (site_brand) {
        await this.settingsService.set(SettingKeys.WEBSITE, { site_brand });
      }

      return { success: true, message: 'System initialized successfully' };
    });
  }
}
