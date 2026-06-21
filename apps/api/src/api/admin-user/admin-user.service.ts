import { IVerifyEmailJob } from '@/common/interfaces/job.interface';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { JobName, QueueName } from '@/constants/job.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { createCacheKey } from '@/utils/cache.util';
import { InjectQueue } from '@nestjs/bullmq';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
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
import { EntityManager, In, Repository } from 'typeorm';
import { RoleEntity } from '../role/entities/role.entity';
import { SettingsService } from '../settings/settings.service';
import { AdminUserResDto } from './dto/admin-user.res.dto';
import { CreateAdminUserReqDto } from './dto/create-admin-user.req.dto';
import { UpdateAdminUserReqDto } from './dto/update-admin-user.req.dto';
import { AdminUserEntity } from './entities/admin-user.entity';

@Injectable()
export class AdminUserService {
  private readonly logger = new Logger(AdminUserService.name);

  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private cls: ClsService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue<IVerifyEmailJob, any, string>,
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

  async createWithManager(manager: EntityManager, data: CreateAdminUserReqDto) {
    const repo = manager.getRepository(AdminUserEntity);
    const roleRepo = manager.getRepository(RoleEntity);
    const roles = await roleRepo.findBy({ id: In(data.roleIds) });
    if (roles.length !== data.roleIds.length) {
      throw new ValidationException(ErrorCode.E002);
    }
    const adminUser = await repo.save(
      repo.create({
        ...data,
        roles,
      }),
    );
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
      password,
      bio,
      roles,
      birthday: birthday ? new Date(birthday) : null,
      phone,
    });

    const savedUser = await this.adminUserRepository.save(newUser);
    await this.sendVerificationEmail(savedUser);

    return plainToInstance(AdminUserResDto, savedUser);
  }

  private async sendVerificationEmail(user: AdminUserEntity): Promise<void> {
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

  async update(id: AutoIncrementID, updateUserDto: UpdateAdminUserReqDto) {
    const user = await this.adminUserRepository.findOneOrFail({
      where: { id },
      relations: ['roles'],
    });

    Object.assign(user, updateUserDto);

    delete user.password;
    delete (user as AdminUserEntity & { roleIds?: AutoIncrementID[] }).roleIds;

    if (updateUserDto.roleIds) {
      const roles = await this.roleRepository.findBy({
        id: In(updateUserDto.roleIds),
      });

      if (roles.length !== updateUserDto.roleIds.length) {
        throw new ValidationException(ErrorCode.E002);
      }

      user.roles = roles;
    }

    await this.adminUserRepository.save(user);
  }

  async remove(id: AutoIncrementID) {
    const admin = await this.adminUserRepository.findOneByOrFail({ id });
    await this.adminUserRepository.softRemove(admin);
  }
}
