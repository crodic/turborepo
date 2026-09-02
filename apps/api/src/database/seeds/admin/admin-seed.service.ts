import { PermissionEntity } from '@/api/permission/entities/permission.entity';
import { syncPermissions } from '@/api/permission/permission-sync';
import { RoleEntity } from '@/api/role/entities/role.entity';
import { AccountEntity } from '@/api/user/entities/account.entity';
import { AdminProfileEntity } from '@/api/user/entities/admin-profile.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import {
  SUPER_ADMIN_ACCOUNT,
  SYSTEM_ROLE_NAME,
} from '@/constants/app.constant';
import {
  DomainType,
  EAccountProvider,
  UserStatus,
} from '@/constants/entity.enum';
import { hashPassword } from '@/utils/password.util';
import { ADMIN_FULL_ACCESS } from '@/utils/permissions.constant';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

@Injectable()
export class AdminSeedService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AdminProfileEntity)
    private readonly adminProfileRepository: Repository<AdminProfileEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
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
        code: 'super_admin',
        description: 'System role',
        isSystem: true,
        domain: DomainType.ADMIN,
        permissionEntities: permissions,
      });
    } else {
      superAdminRole.isSystem = true;
      superAdminRole.permissionEntities = permissions;
    }

    superAdminRole = await this.roleRepository.save(superAdminRole);

    let existingAdmin = await this.userRepository.findOne({
      where: {
        email: SUPER_ADMIN_ACCOUNT.email.toLowerCase().trim(),
        domain: DomainType.ADMIN,
      },
      relations: ['adminProfile'],
      withDeleted: true,
    });

    if (!existingAdmin) {
      existingAdmin = await this.userRepository.save(
        this.userRepository.create({
          email: SUPER_ADMIN_ACCOUNT.email.toLowerCase().trim(),
          password: await hashPassword(SUPER_ADMIN_ACCOUNT.password),
          firstName: 'System',
          lastName: 'Administrator',
          domain: DomainType.ADMIN,
          status: UserStatus.ACTIVE,
          roles: [superAdminRole],
          isEmailVerified: true,
          verifiedAt: new Date(),
        }),
      );

      await this.adminProfileRepository.save(
        this.adminProfileRepository.create({
          userId: existingAdmin.id,
        }),
      );
    }

    const existingAccount = await this.accountRepository.findOne({
      where: {
        userId: existingAdmin.id,
        provider: EAccountProvider.LOCAL,
      },
    });

    if (!existingAccount) {
      await this.accountRepository.save(
        this.accountRepository.create({
          userId: existingAdmin.id,
          provider: EAccountProvider.LOCAL,
          providerAccountId: existingAdmin.email,
        }),
      );
    }
  }
}
