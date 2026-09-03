import { PermissionEntity } from '@/api/permission/entities/permission.entity';
import { syncPermissions } from '@/api/permission/permission-sync';
import { RoleEntity } from '@/api/role/entities/role.entity';
import { AccountEntity } from '@/api/user/entities/account.entity';
import { UserProfileEntity } from '@/api/user/entities/user-profile.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import {
  DomainType,
  EAccountProvider,
  UserStatus,
} from '@/constants/entity.enum';
import {
  CUSTOMER_DEFAULT_PERMISSION_KEY,
  CUSTOMER_ROLE_CODE,
  CUSTOMER_ROLE_NAME,
} from '@/utils/permissions.constant';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

interface SeedUserData {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  avatar?: string;
}

const users: SeedUserData[] = [
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'user.seed.1@example.com',
    password: '12345678',
    avatar: 'https://i.pravatar.cc/150?img=1',
  },
  {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'user.seed.2@example.com',
    password: '12345678',
    avatar: 'https://i.pravatar.cc/150?img=2',
  },
  {
    firstName: 'Alex',
    lastName: 'Smith',
    email: 'user.seed.3@example.com',
    password: '12345678',
    avatar: 'https://i.pravatar.cc/150?img=3',
  },
  {
    firstName: 'Taylor',
    lastName: 'Brown',
    email: 'user.seed.4@example.com',
    password: '12345678',
    avatar: 'https://i.pravatar.cc/150?img=4',
  },
  {
    firstName: 'Morgan',
    lastName: 'Wilson',
    email: 'user.seed.5@example.com',
    password: '12345678',
    avatar: 'https://i.pravatar.cc/150?img=5',
  },
];

@Injectable()
export class UserSeedService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly userProfileRepository: Repository<UserProfileEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async run(): Promise<void> {
    await syncPermissions(this.permissionRepository);

    const customerPermissions = await this.permissionRepository.findBy({
      key: In([CUSTOMER_DEFAULT_PERMISSION_KEY]),
    });

    let customerRole = await this.roleRepository.findOne({
      where: { code: CUSTOMER_ROLE_CODE, domain: DomainType.CLIENT },
      relations: ['permissionEntities'],
    });

    if (!customerRole) {
      customerRole = this.roleRepository.create({
        name: CUSTOMER_ROLE_NAME,
        code: CUSTOMER_ROLE_CODE,
        description: 'Default customer role',
        isSystem: true,
        domain: DomainType.CLIENT,
        permissionEntities: customerPermissions,
      });
      customerRole = await this.roleRepository.save(customerRole);
    } else {
      customerRole.isSystem = true;
      customerRole.permissionEntities = customerPermissions;
      customerRole = await this.roleRepository.save(customerRole);
    }

    for (const user of users) {
      let existingUser = await this.userRepository.findOne({
        where: {
          email: user.email.toLowerCase().trim(),
          domain: DomainType.CLIENT,
        },
        relations: ['userProfile', 'roles'],
        withDeleted: true,
      });

      if (!existingUser) {
        existingUser = await this.userRepository.save(
          this.userRepository.create({
            email: user.email.toLowerCase().trim(),
            password: user.password,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.avatar,
            domain: DomainType.CLIENT,
            status: UserStatus.ACTIVE,
            isEmailVerified: true,
            verifiedAt: new Date(),
            roles: [customerRole],
          }),
        );

        await this.userProfileRepository.save(
          this.userProfileRepository.create({
            userId: existingUser.id,
          }),
        );
      } else if (!existingUser.roles || existingUser.roles.length === 0) {
        existingUser.roles = [customerRole];
        await this.userRepository.save(existingUser);
      }

      const existingAccount = await this.accountRepository.findOne({
        where: {
          userId: existingUser.id,
          provider: EAccountProvider.LOCAL,
        },
      });

      if (!existingAccount && user.password) {
        await this.accountRepository.save(
          this.accountRepository.create({
            userId: existingUser.id,
            provider: EAccountProvider.LOCAL,
            providerAccountId: existingUser.email,
          }),
        );
      }
    }
  }
}
