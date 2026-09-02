import { RoleEntity } from '@/api/role/entities/role.entity';
import { SettingsService } from '@/api/settings/settings.service';
import { AccountEntity } from '@/api/user/entities/account.entity';
import { AdminProfileEntity } from '@/api/user/entities/admin-profile.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import {
  DomainType,
  EAccountProvider,
  UserStatus,
} from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { JobName, QueueName } from '@/constants/job.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { createCacheKey } from '@/utils/cache.util';
import { InjectQueue } from '@nestjs/bullmq';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import assert from 'assert';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import ms, { StringValue } from 'ms';
import { ClsService } from 'nestjs-cls';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { EntityManager, In, LessThan, Repository } from 'typeorm';
import { AdminUserResDto } from './dto/admin-user.res.dto';
import { CreateAdminUserReqDto } from './dto/create-admin-user.req.dto';
import { UpdateAdminUserReqDto } from './dto/update-admin-user.req.dto';

@Injectable()
export class AdminUserService {
  private readonly logger = new Logger(AdminUserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AdminProfileEntity)
    private readonly adminProfileRepository: Repository<AdminProfileEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private cls: ClsService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue<any, any, string>,
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

  async createWithManager(
    manager: EntityManager,
    data: CreateAdminUserReqDto & { verifiedAt?: Date },
  ) {
    const userRepo = manager.getRepository(UserEntity);
    const profileRepo = manager.getRepository(AdminProfileEntity);
    const accountRepo = manager.getRepository(AccountEntity);
    const roleRepo = manager.getRepository(RoleEntity);

    const roles = data.roleIds?.length
      ? await roleRepo.findBy({ id: In(data.roleIds) })
      : [];

    if (data.roleIds?.length && roles.length !== data.roleIds.length) {
      throw new ValidationException(ErrorCode.E002);
    }

    const adminUser = await userRepo.save(
      userRepo.create({
        email: data.email.toLowerCase().trim(),
        password: data.password,
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

    if (data.password) {
      await accountRepo.save(
        accountRepo.create({
          userId: adminUser.id,
          provider: EAccountProvider.LOCAL,
          providerAccountId: adminUser.email,
        }),
      );
    }

    this.cacheManager.del(CacheKey.SYSTEM_HAS_ADMIN);

    return adminUser;
  }

  async create(dto: CreateAdminUserReqDto): Promise<AdminUserResDto> {
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
    });

    if (roles.length !== roleIds.length) {
      throw new ValidationException(ErrorCode.E002);
    }

    const newUser = this.userRepository.create({
      email: email.toLowerCase().trim(),
      password,
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

    if (password) {
      await this.accountRepository.save(
        this.accountRepository.create({
          userId: savedUser.id,
          provider: EAccountProvider.LOCAL,
          providerAccountId: savedUser.email,
        }),
      );
    }

    await this.sendVerificationEmail(savedUser);

    savedUser.adminProfile = profile;
    return plainToInstance(AdminUserResDto, savedUser, {
      excludeExtraneousValues: true,
    });
  }

  private async sendVerificationEmail(user: UserEntity): Promise<void> {
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
    await this.emailQueue.add(
      JobName.ADMIN_EMAIL_VERIFICATION,
      {
        email: user.email,
        token,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );
  }

  async findAllUser(query: PaginateQuery): Promise<Paginated<AdminUserResDto>> {
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

  async findOne(id: AutoIncrementID): Promise<AdminUserResDto> {
    assert(id, 'id is required');
    const user = await this.userRepository.findOneOrFail({
      where: { id, domain: DomainType.ADMIN },
      relations: ['adminProfile', 'roles', 'roles.permissionEntities'],
    });

    return plainToInstance(AdminUserResDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async update(id: AutoIncrementID, updateUserDto: UpdateAdminUserReqDto) {
    const user = await this.userRepository.findOneOrFail({
      where: { id, domain: DomainType.ADMIN },
      relations: ['adminProfile', 'roles'],
    });

    if (updateUserDto.roleIds) {
      const roles = await this.roleRepository.findBy({
        id: In(updateUserDto.roleIds),
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
  }

  async remove(id: AutoIncrementID) {
    const admin = await this.userRepository.findOneOrFail({
      where: { id, domain: DomainType.ADMIN },
    });
    await this.userRepository.softRemove(admin);
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
      await this.emailQueue.add(JobName.ADMIN_ACCOUNT_HARD_DELETED as any, {
        email: user.email,
        adminName: user.fullName || user.email,
        deletedAt: user.deletedAt?.toISOString(),
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
      await this.emailQueue.add(
        JobName.ADMIN_ACCOUNT_HARD_DELETED_REPORT as any,
        {
          email: admin.email,
          adminName: admin.fullName || admin.email,
          deletedCount: usersToDelete.length,
        },
      );
    }
  }
}
