import { AutoIncrementID } from '@/common/types/common.type';
import { ACCOUNT_RESTORE_GRACE_PERIOD_MS } from '@/constants/app.constant';
import { CacheKey } from '@/constants/cache.constant';
import { EAccountProvider } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { JobName, QueueName } from '@/constants/job.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { InjectQueue } from '@nestjs/bullmq';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import assert from 'assert';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { EntityManager, In, LessThan, Repository } from 'typeorm';
import { AdminAccountRecoveryService } from '../auth/services/admin-account-recovery.service';
import { RoleEntity } from '../role/entities/role.entity';
import { AdminUserResDto } from './dto/admin-user.res.dto';
import { CreateAdminUserReqDto } from './dto/create-admin-user.req.dto';
import { UpdateAdminUserReqDto } from './dto/update-admin-user.req.dto';
import { AdminAccountEntity } from './entities/admin-account.entity';
import { AdminUserEntity } from './entities/admin-user.entity';

@Injectable()
export class AdminUserService {
  private readonly logger = new Logger(AdminUserService.name);

  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(AdminAccountEntity)
    private readonly adminAccountRepository: Repository<AdminAccountEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly adminAccountRecoveryService: AdminAccountRecoveryService,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue<any, any, string>,
  ) {}

  async hasAdmin(): Promise<boolean> {
    const cacheKey = CacheKey.SYSTEM_HAS_ADMIN;
    const cached = await this.cacheManager.get<boolean>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    const count = await this.adminUserRepository.count();
    const hasAdmin = count > 0;

    await this.cacheManager.set(cacheKey, hasAdmin, 60_000);

    return hasAdmin;
  }

  async createWithManager(
    manager: EntityManager,
    data: CreateAdminUserReqDto & { verifiedAt?: Date },
  ) {
    const repo = manager.getRepository(AdminUserEntity);
    const accountRepo = manager.getRepository(AdminAccountEntity);
    const roleRepo = manager.getRepository(RoleEntity);
    const roles = await roleRepo.findBy({ id: In(data.roleIds) });
    if (roles.length !== data.roleIds.length) {
      throw new ValidationException(ErrorCode.E002);
    }
    const adminUser = await repo.save(
      repo.create({
        ...data,
        roles,
        verifiedAt: data.verifiedAt ?? new Date(),
      }),
    );

    if (data.password) {
      await accountRepo.save(
        new AdminAccountEntity({
          adminUserId: adminUser.id,
          provider: EAccountProvider.LOCAL,
          providerAccountId: adminUser.email,
          password: data.password,
        }),
      );
    }

    this.cacheManager.del(CacheKey.SYSTEM_HAS_ADMIN);

    return adminUser;
  }

  async create(dto: CreateAdminUserReqDto): Promise<AdminUserResDto> {
    const {
      email,
      password,
      bio,
      firstName,
      lastName,
      roleIds,
      birthday,
      phone,
    } = dto;

    const user = await this.adminUserRepository.findOne({
      where: {
        email,
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

    const newUser = new AdminUserEntity({
      firstName,
      lastName,
      email,
      bio,
      roles,
      birthday: birthday ? new Date(birthday) : null,
      phone,
    });

    const savedUser = await this.adminUserRepository.save(newUser);

    if (password) {
      await this.adminAccountRepository.save(
        new AdminAccountEntity({
          adminUserId: savedUser.id,
          provider: EAccountProvider.LOCAL,
          providerAccountId: savedUser.email,
          password,
        }),
      );
    }

    await this.adminAccountRecoveryService.sendVerificationEmail(savedUser);

    return plainToInstance(AdminUserResDto, savedUser);
  }

  async findAllUser(query: PaginateQuery): Promise<Paginated<AdminUserResDto>> {
    const queryBuilder = this.adminUserRepository.createQueryBuilder('admin');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'email', 'createdAt', 'updatedAt'],
      searchableColumns: ['email'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        'roles.id': [FilterOperator.IN],
        email: [FilterOperator.ILIKE],
        fullName: [FilterOperator.ILIKE],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
      },
      relations: ['roles', 'roles.permissionEntities'],
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
    const user = await this.adminUserRepository.findOneOrFail({
      where: { id },
      relations: ['roles', 'roles.permissionEntities'],
    });

    return user.toDto(AdminUserResDto);
  }

  /**
   * Updates an admin user's profile and assigned roles.
   * Modifies only specified fields explicitly without mutating unwanted properties.
   */
  async update(id: AutoIncrementID, updateUserDto: UpdateAdminUserReqDto) {
    const user = await this.adminUserRepository.findOneOrFail({
      where: { id },
      relations: ['roles'],
    });

    if (updateUserDto.firstName !== undefined) {
      user.firstName = updateUserDto.firstName;
    }
    if (updateUserDto.lastName !== undefined) {
      user.lastName = updateUserDto.lastName;
    }
    if (updateUserDto.email !== undefined) {
      user.email = updateUserDto.email;
    }
    if (updateUserDto.phone !== undefined) {
      user.phone = updateUserDto.phone;
    }
    if (updateUserDto.bio !== undefined) {
      user.bio = updateUserDto.bio;
    }
    if (updateUserDto.birthday !== undefined) {
      user.birthday = updateUserDto.birthday;
    }

    if (updateUserDto.roleIds) {
      const roles = await this.roleRepository.findBy({
        id: In(updateUserDto.roleIds),
      });

      if (roles.length !== updateUserDto.roleIds.length) {
        throw new ValidationException(ErrorCode.E002);
      }

      user.roles = roles;
    }

    // Ensure password is not inadvertently modified or re-hashed during profile update
    delete user.password;

    await this.adminUserRepository.save(user);
  }

  async remove(id: AutoIncrementID) {
    const admin = await this.adminUserRepository.findOneByOrFail({ id });
    await this.adminUserRepository.softRemove(admin);
  }

  /**
   * Business Rule: Daily scheduled purge of soft-deleted admin accounts.
   * Accounts soft-deleted more than 30 days ago (ACCOUNT_RESTORE_GRACE_PERIOD_MS)
   * are permanently hard-deleted. Sends notification emails to the deleted users
   * and dispatches a summary report to active system administrators.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async hardDeleteOldAccounts() {
    const thresholdDate = new Date(
      Date.now() - ACCOUNT_RESTORE_GRACE_PERIOD_MS,
    );

    const usersToDelete = await this.adminUserRepository.find({
      where: {
        deletedAt: LessThan(thresholdDate),
      },
      withDeleted: true,
    });

    if (usersToDelete.length === 0) {
      return;
    }

    // Hard delete records from the database
    const idsToDelete = usersToDelete.map((u) => u.id);
    await this.adminUserRepository.delete({
      id: In(idsToDelete),
    });

    // Notify each permanently deleted account owner
    for (const user of usersToDelete) {
      await this.emailQueue.add(JobName.ADMIN_ACCOUNT_HARD_DELETED, {
        email: user.email,
        adminName: user.fullName || user.firstName,
        deletedAt: user.deletedAt.toISOString(),
      });
    }

    // Send summary report to active admins with email notifications enabled
    const allAdmins = await this.adminUserRepository.find();
    const adminsToNotify = allAdmins.filter(
      (admin) => admin.notifications?.email !== false,
    );

    for (const admin of adminsToNotify) {
      await this.emailQueue.add(JobName.ADMIN_ACCOUNT_HARD_DELETED_REPORT, {
        email: admin.email,
        adminName: admin.fullName || admin.firstName,
        deletedCount: usersToDelete.length,
      });
    }
  }
}
