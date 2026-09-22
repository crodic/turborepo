import { PermissionEntity } from '@/api/permission/entities/permission.entity';
import { syncPermissions } from '@/api/permission/permission-sync';
import { SYSTEM_ROLE_NAME } from '@/constants/app.constant';
import { CmsPageSeedService } from '@/database/seeds/cms-page/cms-page-seed.service';
import { LocationSeedService } from '@/database/seeds/location/location-seed.service';
import { SettingSeedService } from '@/database/seeds/setting/setting-seed.service';
import { WhiteLabelSeedService } from '@/database/seeds/white-label/white-label-seed.service';
import { ADMIN_FULL_ACCESS } from '@/utils/permissions.constant';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminUserService } from '../admin-user/admin-user.service';
import { RoleService } from '../role/role.service';
import { WhiteLabelService } from '../white-label/white-label.service';
import { CreateSystemSetupReqDto } from './dto/create-system-setup.req.dto';

@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly adminUserService: AdminUserService,
    private readonly roleService: RoleService,
    private readonly whiteLabelService: WhiteLabelService,
    private readonly settingSeedService: SettingSeedService,
    private readonly whiteLabelSeedService: WhiteLabelSeedService,
    private readonly cmsPageSeedService: CmsPageSeedService,
    private readonly locationSeedService: LocationSeedService,
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

    const {
      email,
      password,
      systemRoleName,
      firstName,
      lastName,
      site_brand,
      theme_key,
      custom_styles,
    } = dto;
    const brandName = site_brand?.trim() || undefined;

    // 1. Transaction to initialize core permissions, system role, and admin user
    await this.dataSource.transaction(async (manager) => {
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
    });

    // 2. Seed Default Website Settings (combined with user-provided brand)
    try {
      await this.settingSeedService.run(brandName);
    } catch (error) {
      this.logger.error('Failed to seed settings during system setup', error);
    }

    // 3. Seed Base White Label Profiles (14 static presets)
    try {
      await this.whiteLabelSeedService.run(brandName);
    } catch (error) {
      this.logger.error(
        'Failed to seed white-label profiles during system setup',
        error,
      );
    }

    // 4. Apply Custom or Preset Theme via WhiteLabelService (Dedicated domain service)
    try {
      await this.whiteLabelService.applySetupTheme({
        brandName,
        themeKey: theme_key,
        customStyles: custom_styles,
      });
    } catch (error) {
      this.logger.error('Failed to apply setup theme', error);
    }

    // 5. Seed Default CMS Pages (Terms of Service, Privacy Policy)
    try {
      await this.cmsPageSeedService.run();
    } catch (error) {
      this.logger.error('Failed to seed CMS pages during system setup', error);
    }

    // 6. Seed Locations in background without delaying HTTP response
    this.locationSeedService
      .run()
      .catch((error) =>
        this.logger.error(
          'Failed to seed locations during system setup',
          error,
        ),
      );

    return { success: true, message: 'System initialized successfully' };
  }
}
