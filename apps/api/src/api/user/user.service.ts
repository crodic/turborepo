import { RoleEntity } from '@/api/role/entities/role.entity';
import { RoleService } from '@/api/role/role.service';
import { AutoIncrementID } from '@/common/types/common.type';
import {
  DomainType,
  EAccountProvider,
  UserStatus,
} from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { FilesystemService } from '@/filesystem/filesystem.service';
import { StoredFile } from '@/filesystem/types/stored-file.type';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Repository } from 'typeorm';
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
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AdminProfileEntity)
    private readonly adminProfileRepository: Repository<AdminProfileEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly userProfileRepository: Repository<UserProfileEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    private readonly roleService: RoleService,
    private readonly filesystemService: FilesystemService,
  ) {}

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

  async remove(id: AutoIncrementID): Promise<void> {
    const user = await this.userRepository.findOneOrFail({
      where: { id, domain: DomainType.CLIENT },
    });
    await this.userRepository.softRemove(user);
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

    const user = this.userRepository.create({
      email: data.email.toLowerCase().trim(),
      password: data.password,
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
      roles: data.roles ?? [],
    });

    const savedUser = await this.userRepository.save(user);

    if (domain === DomainType.ADMIN) {
      const adminProfile = this.adminProfileRepository.create({
        userId: savedUser.id,
        bio: data.bio ?? undefined,
      });
      await this.adminProfileRepository.save(adminProfile);
      savedUser.adminProfile = adminProfile;
    } else {
      const userProfile = this.userProfileRepository.create({
        userId: savedUser.id,
        bio: data.bio ?? undefined,
        birthday: data.birthday ?? undefined,
      });
      await this.userProfileRepository.save(userProfile);
      savedUser.userProfile = userProfile;
    }

    if (data.password) {
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
}
