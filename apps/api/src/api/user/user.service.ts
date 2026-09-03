import { RoleEntity } from '@/api/role/entities/role.entity';
import { RoleService } from '@/api/role/role.service';
import { EmailQueueService } from '@/background/queues/email-queue/email-queue.service';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import {
  DomainType,
  EAccountProvider,
  UserStatus,
} from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { FilesystemService } from '@/filesystem/filesystem.service';
import { StoredFile } from '@/filesystem/types/stored-file.type';
import { createCacheKey } from '@/utils/cache.util';
import { hashPassword } from '@/utils/password.util';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import assert from 'assert';
import { plainToInstance } from 'class-transformer';
import ms, { StringValue } from 'ms';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { EntityManager, In, LessThan, Repository } from 'typeorm';
import { AdminUserResDto } from '../admin-user/dto/admin-user.res.dto';
import { CreateAdminUserReqDto } from '../admin-user/dto/create-admin-user.req.dto';
import { UpdateAdminUserReqDto } from '../admin-user/dto/update-admin-user.req.dto';
import { UpdateUserReqDto } from './dto/update-user.req.dto';
import { UserResDto } from './dto/user.res.dto';
import { AccountEntity } from './entities/account.entity';
import { AdminProfileEntity } from './entities/admin-profile.entity';
import { UserProfileEntity } from './entities/user-profile.entity';
import { UserEntity } from './entities/user.entity';

export interface ICreateOAuthUserDto {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  domain: DomainType;
  provider: EAccountProvider;
  providerAccountId: string;
  avatarUrl?: string | null;
  locale?: string | null;
  isEmailVerified?: boolean;
  tokens?: {
    accessToken?: string | null;
    refreshToken?: string | null;
    idToken?: string | null;
    tokenExpiresAt?: Date | null;
    tokenType?: string | null;
    scope?: string | null;
  };
  profileData?: Record<string, unknown> | null;
  roles?: RoleEntity[];
}

export interface ILinkAccountDto {
  userId: AutoIncrementID;
  provider: EAccountProvider;
  providerAccountId: string;
  type?: string;
  tokens?: {
    accessToken?: string | null;
    refreshToken?: string | null;
    idToken?: string | null;
    tokenExpiresAt?: Date | null;
    tokenType?: string | null;
    scope?: string | null;
  };
  profileData?: Record<string, unknown> | null;
}

export interface IUpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  locale?: string;
  birthday?: Date;
  notifications?: Record<string, boolean>;
}

export interface ICreateUserParams {
  email: string;
  password?: string | null;
  domain?: DomainType;
  status?: UserStatus;
  phone?: string | null;
  locale?: string | null;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  verifiedAt?: Date | null;
  roles?: RoleEntity[];
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  birthday?: Date | null;
  confirmPassword?: string;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AdminProfileEntity)
    private readonly adminProfileRepository: Repository<AdminProfileEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly userProfileRepository: Repository<UserProfileEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly roleService: RoleService,
    private readonly filesystemService: FilesystemService,
    private readonly emailQueueService: EmailQueueService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async hasAdmin(): Promise<boolean> {
    const cacheKey = CacheKey.SYSTEM_HAS_ADMIN;
    const cached = await this.cacheManager.get<boolean>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    const count = await this.userRepository.count({
      where: { domain: DomainType.ADMIN },
    });
    const hasAdmin = count > 0;

    await this.cacheManager.set(cacheKey, hasAdmin, 60_000);

    return hasAdmin;
  }

  async findById(id: AutoIncrementID): Promise<UserEntity | null> {
    return await this.userRepository.findOne({
      where: { id },
      relations: {
        adminProfile: true,
        userProfile: true,
        roles: {
          permissionEntities: true,
        },
        accounts: true,
      },
    });
  }

  async findByEmailAndDomain(
    email: string,
    domain: DomainType,
  ): Promise<UserEntity | null> {
    return await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim(), domain },
      relations: {
        adminProfile: true,
        userProfile: true,
        roles: {
          permissionEntities: true,
        },
        accounts: true,
      },
    });
  }

  async findByOAuth(
    provider: EAccountProvider,
    providerAccountId: string,
  ): Promise<UserEntity | null> {
    const account = await this.accountRepository.findOne({
      where: { provider, providerAccountId },
      relations: {
        user: {
          adminProfile: true,
          userProfile: true,
          roles: {
            permissionEntities: true,
          },
          accounts: true,
        },
      },
    });
    return account?.user ?? null;
  }

  async findRolesByCodes(codes: string[]): Promise<RoleEntity[]> {
    return await this.roleService.findByNames(codes);
  }

  async findAllUser(query: PaginateQuery): Promise<Paginated<UserResDto>> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userProfile', 'userProfile')
      .where('user.domain = :domain', { domain: DomainType.CLIENT });

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'email', 'createdAt', 'updatedAt'],
      searchableColumns: ['email', 'fullName', 'firstName', 'lastName'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        email: [FilterOperator.ILIKE],
        fullName: [FilterOperator.ILIKE],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
      },
      relations: ['userProfile'],
    });

    return {
      ...result,
      data: plainToInstance(UserResDto, result.data, {
        excludeExtraneousValues: true,
      }),
    } as Paginated<UserResDto>;
  }

  async findOne(id: AutoIncrementID): Promise<UserResDto> {
    const user = await this.userRepository.findOneOrFail({
      where: { id, domain: DomainType.CLIENT },
      relations: ['userProfile'],
    });

    return plainToInstance(UserResDto, user, { excludeExtraneousValues: true });
  }

  async update(
    id: AutoIncrementID,
    dto: UpdateUserReqDto,
  ): Promise<UserResDto> {
    const user = await this.userRepository.findOneOrFail({
      where: { id, domain: DomainType.CLIENT },
      relations: ['userProfile'],
    });

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;

    await this.userRepository.save(user);

    return plainToInstance(UserResDto, user, { excludeExtraneousValues: true });
  }

  async remove(
    id: AutoIncrementID,
    domain: DomainType = DomainType.CLIENT,
  ): Promise<void> {
    const user = await this.userRepository.findOneOrFail({
      where: { id, domain },
    });
    await this.userRepository.softRemove(user);
    if (domain === DomainType.ADMIN) {
      await this.cacheManager.del(CacheKey.SYSTEM_HAS_ADMIN);
    }
  }

  async create(data: ICreateUserParams): Promise<UserResDto> {
    const domain = data.domain ?? DomainType.CLIENT;

    if (
      data.confirmPassword &&
      data.password &&
      data.password !== data.confirmPassword
    ) {
      throw new ValidationException(ErrorCode.E003);
    }

    const isExistUser = await this.userRepository.exists({
      where: { email: data.email.toLowerCase().trim(), domain },
    });

    if (isExistUser) {
      throw new ValidationException(ErrorCode.E003);
    }

    const roles = data.roles ?? [];

    const hashedPassword = data.password
      ? await hashPassword(data.password)
      : null;

    const user = this.userRepository.create({
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      phone: data.phone,
      avatarUrl: data.avatarUrl,
      domain,
      status: data.status ?? UserStatus.ACTIVE,
      locale: data.locale ?? 'en',
      isEmailVerified: data.isEmailVerified ?? false,
      isPhoneVerified: data.isPhoneVerified ?? false,
      verifiedAt: data.verifiedAt,
      roles: roles ?? [],
    });

    const savedUser = await this.userRepository.save(user);

    if (domain === DomainType.ADMIN) {
      const adminProfile = this.adminProfileRepository.create({
        userId: savedUser.id,
        bio: data.bio ?? undefined,
      });
      await this.adminProfileRepository.save(adminProfile);
      savedUser.adminProfile = adminProfile;
      await this.cacheManager.del(CacheKey.SYSTEM_HAS_ADMIN);
    } else {
      const userProfile = this.userProfileRepository.create({
        userId: savedUser.id,
        bio: data.bio ?? undefined,
        birthday: data.birthday ?? undefined,
      });
      await this.userProfileRepository.save(userProfile);
      savedUser.userProfile = userProfile;
    }

    if (hashedPassword) {
      await this.accountRepository.save(
        this.accountRepository.create({
          userId: savedUser.id,
          provider: EAccountProvider.LOCAL,
          providerAccountId: savedUser.email,
        }),
      );
    }

    return plainToInstance(UserResDto, savedUser, {
      excludeExtraneousValues: true,
    });
  }

  async createOAuthUser(dto: ICreateOAuthUserDto): Promise<UserEntity> {
    const user = this.userRepository.create({
      email: dto.email.toLowerCase().trim(),
      firstName: dto.firstName ?? '',
      lastName: dto.lastName ?? '',
      avatarUrl: dto.avatarUrl ?? undefined,
      domain: dto.domain,
      status: UserStatus.ACTIVE,
      locale: dto.locale ?? 'en',
      isEmailVerified: dto.isEmailVerified ?? true,
      verifiedAt: dto.isEmailVerified ? new Date() : null,
      roles: dto.roles ?? [],
    });

    const savedUser = await this.userRepository.save(user);

    if (dto.domain === DomainType.ADMIN) {
      const adminProfile = this.adminProfileRepository.create({
        userId: savedUser.id,
      });
      await this.adminProfileRepository.save(adminProfile);
      savedUser.adminProfile = adminProfile;
    } else {
      const userProfile = this.userProfileRepository.create({
        userId: savedUser.id,
      });
      await this.userProfileRepository.save(userProfile);
      savedUser.userProfile = userProfile;
    }

    await this.accountRepository.save(
      this.accountRepository.create({
        userId: savedUser.id,
        provider: dto.provider,
        providerAccountId: dto.providerAccountId,
        type: 'oauth',
        accessToken: dto.tokens?.accessToken ?? undefined,
        refreshToken: dto.tokens?.refreshToken ?? undefined,
        idToken: dto.tokens?.idToken ?? undefined,
        tokenExpiresAt: dto.tokens?.tokenExpiresAt ?? undefined,
        tokenType: dto.tokens?.tokenType ?? undefined,
        scope: dto.tokens?.scope ?? undefined,
        profileData: dto.profileData ?? undefined,
      }),
    );

    return savedUser;
  }

  async linkAccount(dto: ILinkAccountDto): Promise<AccountEntity> {
    const account = this.accountRepository.create({
      userId: dto.userId,
      provider: dto.provider,
      providerAccountId: dto.providerAccountId,
      type: dto.type ?? 'oauth',
      accessToken: dto.tokens?.accessToken ?? undefined,
      refreshToken: dto.tokens?.refreshToken ?? undefined,
      idToken: dto.tokens?.idToken ?? undefined,
      tokenExpiresAt: dto.tokens?.tokenExpiresAt ?? undefined,
      tokenType: dto.tokens?.tokenType ?? undefined,
      scope: dto.tokens?.scope ?? undefined,
      profileData: dto.profileData ?? undefined,
    });

    return await this.accountRepository.save(account);
  }

  async getProfile(
    userId: AutoIncrementID,
    domain: DomainType,
  ): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id: userId, domain },
      relations: {
        adminProfile: domain === DomainType.ADMIN,
        userProfile: domain === DomainType.CLIENT,
        roles: {
          permissionEntities: true,
        },
        accounts: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  async updateProfile(
    userId: AutoIncrementID,
    domain: DomainType,
    dto: IUpdateProfileDto,
  ): Promise<UserEntity> {
    const user = await this.getProfile(userId, domain);

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone;

    await this.userRepository.save(user);

    if (domain === DomainType.ADMIN) {
      let profile = user.adminProfile;
      if (!profile) {
        profile = this.adminProfileRepository.create({ userId: user.id });
      }
      if (dto.bio !== undefined) profile.bio = dto.bio;
      if (dto.notifications !== undefined)
        profile.notifications = dto.notifications;
      await this.adminProfileRepository.save(profile);
      user.adminProfile = profile;
    } else {
      let profile = user.userProfile;
      if (!profile) {
        profile = this.userProfileRepository.create({ userId: user.id });
      }
      if (dto.bio !== undefined) profile.bio = dto.bio;
      if (dto.birthday !== undefined) profile.birthday = dto.birthday;
      if (dto.notifications !== undefined)
        profile.notifications = dto.notifications;
      await this.userProfileRepository.save(profile);
      user.userProfile = profile;
    }

    return user;
  }

  async updateAvatar(
    userId: AutoIncrementID,
    domain: DomainType,
    file: StoredFile,
  ): Promise<string> {
    const user = await this.getProfile(userId, domain);

    if (user.avatarUrl) {
      await this.removeOldAvatarFile(user.avatarUrl);
    }
    user.avatarUrl = file.url;
    await this.userRepository.save(user);

    return user.avatarUrl;
  }

  async deleteAvatar(
    userId: AutoIncrementID,
    domain: DomainType,
  ): Promise<void> {
    const user = await this.getProfile(userId, domain);

    if (user.avatarUrl) {
      await this.removeOldAvatarFile(user.avatarUrl);
      user.avatarUrl = null;
      await this.userRepository.save(user);
    }
  }

  private async removeOldAvatarFile(avatarUrl: string): Promise<void> {
    try {
      if (avatarUrl.includes('/storage/')) {
        const relativePath = avatarUrl.split('/storage/')[1];
        if (relativePath) {
          const publicDisk = this.filesystemService.disk('public');
          if (await publicDisk.exists(relativePath)) {
            await publicDisk.delete(relativePath);
          }
        }
      }
    } catch {
      // Silently catch disk deletion errors to not fail the transaction
    }
  }

  async updateLastLogin(userId: AutoIncrementID): Promise<void> {
    await this.userRepository.update(userId, { lastLoginAt: new Date() });
  }

  async save(user: UserEntity): Promise<UserEntity> {
    return await this.userRepository.save(user);
  }

  async createWithManager(
    manager: EntityManager,
    data: CreateAdminUserReqDto & { verifiedAt?: Date },
  ) {
    const userRepo = manager.getRepository(UserEntity);
    const profileRepo = manager.getRepository(AdminProfileEntity);
    const accountRepo = manager.getRepository(AccountEntity);
    const roleRepo = manager.getRepository(RoleEntity);

    const roles = data.roleIds?.length
      ? await roleRepo.findBy({
          id: In(data.roleIds),
          domain: DomainType.ADMIN,
        })
      : [];

    if (data.roleIds?.length && roles.length !== data.roleIds.length) {
      throw new ValidationException(ErrorCode.E002);
    }

    const hashedPassword = data.password
      ? await hashPassword(data.password)
      : undefined;

    const adminUser = await userRepo.save(
      userRepo.create({
        email: data.email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        domain: DomainType.ADMIN,
        status: UserStatus.ACTIVE,
        roles,
        isEmailVerified: true,
        verifiedAt: data.verifiedAt ?? new Date(),
      }),
    );

    await profileRepo.save(
      profileRepo.create({
        userId: adminUser.id,
        bio: data.bio,
      }),
    );

    if (adminUser.password) {
      await accountRepo.save(
        accountRepo.create({
          userId: adminUser.id,
          provider: EAccountProvider.LOCAL,
          providerAccountId: adminUser.email,
        }),
      );
    }

    await this.cacheManager.del(CacheKey.SYSTEM_HAS_ADMIN);

    return adminUser;
  }

  async createAdminUser(dto: CreateAdminUserReqDto): Promise<AdminUserResDto> {
    const { email, password, bio, firstName, lastName, roleIds, phone } = dto;

    const user = await this.userRepository.findOne({
      where: {
        email: email.toLowerCase().trim(),
        domain: DomainType.ADMIN,
      },
    });

    if (user) {
      throw new ValidationException(ErrorCode.E001);
    }

    const roles = await this.roleRepository.findBy({
      id: In(roleIds),
      domain: DomainType.ADMIN,
    });

    if (roles.length !== roleIds.length) {
      throw new ValidationException(ErrorCode.E002);
    }

    const hashedPassword = await hashPassword(password);

    const newUser = this.userRepository.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      domain: DomainType.ADMIN,
      status: UserStatus.ACTIVE,
      roles,
    });

    const savedUser = await this.userRepository.save(newUser);

    const profile = this.adminProfileRepository.create({
      userId: savedUser.id,
      bio,
    });
    await this.adminProfileRepository.save(profile);

    if (hashedPassword) {
      await this.accountRepository.save(
        this.accountRepository.create({
          userId: savedUser.id,
          provider: EAccountProvider.LOCAL,
          providerAccountId: savedUser.email,
        }),
      );
    }

    await this.sendAdminVerificationEmail(savedUser);
    await this.cacheManager.del(CacheKey.SYSTEM_HAS_ADMIN);

    savedUser.adminProfile = profile;
    return plainToInstance(AdminUserResDto, savedUser, {
      excludeExtraneousValues: true,
    });
  }

  private async sendAdminVerificationEmail(user: UserEntity): Promise<void> {
    const token = await this.jwtService.signAsync(
      {
        id: user.id,
      },
      {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
          infer: true,
        }),
      },
    );
    const tokenExpiresIn = this.configService.getOrThrow(
      'auth.confirmEmailExpires',
      {
        infer: true,
      },
    );

    await this.cacheManager.set(
      createCacheKey(CacheKey.EMAIL_VERIFICATION, user.id),
      token,
      ms(tokenExpiresIn as StringValue),
    );
    await this.emailQueueService.sendAdminEmailVerification({
      email: user.email,
      token,
    });
  }

  async findAllAdmin(
    query: PaginateQuery,
  ): Promise<Paginated<AdminUserResDto>> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.adminProfile', 'adminProfile')
      .where('user.domain = :domain', { domain: DomainType.ADMIN });

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'email', 'createdAt', 'updatedAt'],
      searchableColumns: ['email', 'fullName', 'firstName', 'lastName'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        'roles.id': [FilterOperator.IN],
        email: [FilterOperator.ILIKE],
        fullName: [FilterOperator.ILIKE],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
      },
      relations: ['roles', 'roles.permissionEntities', 'adminProfile'],
    });

    return {
      ...result,
      data: plainToInstance(AdminUserResDto, result.data, {
        excludeExtraneousValues: true,
      }),
    } as Paginated<AdminUserResDto>;
  }

  async findOneAdmin(id: AutoIncrementID): Promise<AdminUserResDto> {
    assert(id, 'id is required');
    const user = await this.userRepository.findOneOrFail({
      where: { id, domain: DomainType.ADMIN },
      relations: ['adminProfile', 'roles', 'roles.permissionEntities'],
    });

    return plainToInstance(AdminUserResDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async updateAdmin(id: AutoIncrementID, updateUserDto: UpdateAdminUserReqDto) {
    const user = await this.userRepository.findOneOrFail({
      where: { id, domain: DomainType.ADMIN },
      relations: ['adminProfile', 'roles'],
    });

    if (updateUserDto.roleIds) {
      const roles = await this.roleRepository.findBy({
        id: In(updateUserDto.roleIds),
        domain: DomainType.ADMIN,
      });

      if (roles.length !== updateUserDto.roleIds.length) {
        throw new ValidationException(ErrorCode.E002);
      }

      user.roles = roles;
    }

    if (updateUserDto.firstName !== undefined)
      user.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName !== undefined)
      user.lastName = updateUserDto.lastName;
    if (updateUserDto.phone !== undefined) user.phone = updateUserDto.phone;

    await this.userRepository.save(user);

    if (updateUserDto.bio !== undefined) {
      let profile = user.adminProfile;
      if (!profile) {
        profile = this.adminProfileRepository.create({ userId: user.id });
      }
      profile.bio = updateUserDto.bio;
      await this.adminProfileRepository.save(profile);
    }

    return plainToInstance(AdminUserResDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async hardDeleteOldAccounts() {
    const msIn30Days = 30 * 24 * 60 * 60 * 1000;
    const thresholdDate = new Date(Date.now() - msIn30Days);

    const usersToDelete = await this.userRepository.find({
      where: {
        domain: DomainType.ADMIN,
        deletedAt: LessThan(thresholdDate),
      },
      relations: ['adminProfile'],
      withDeleted: true,
    });

    if (usersToDelete.length === 0) {
      return;
    }

    // Hard delete
    const idsToDelete = usersToDelete.map((u) => u.id);
    await this.userRepository.delete({
      id: In(idsToDelete),
    });

    // Send email to deleted users
    for (const user of usersToDelete) {
      await this.emailQueueService.sendAdminAccountHardDeleted({
        email: user.email,
        adminName: user.fullName || user.email,
        deletedAt: user.deletedAt?.toISOString() || new Date().toISOString(),
      });
    }

    // Send summary report to system admins
    const allAdmins = await this.userRepository.find({
      where: { domain: DomainType.ADMIN },
      relations: ['adminProfile'],
    });
    const adminsToNotify = allAdmins.filter(
      (admin) => admin.adminProfile?.notifications?.email !== false,
    );

    for (const admin of adminsToNotify) {
      await this.emailQueueService.sendAdminAccountHardDeletedReport({
        email: admin.email,
        adminName: admin.fullName || admin.email,
        deletedCount: usersToDelete.length,
      });
    }
  }
}
