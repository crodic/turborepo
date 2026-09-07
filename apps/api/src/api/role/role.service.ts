import { AutoIncrementID } from '@/common/types/common.type';
import { SYSTEM_ROLE_NAME } from '@/constants/app.constant';
import { CacheKey } from '@/constants/cache.constant';
import { DomainType } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import {
  ADMIN_FULL_ACCESS,
  CUSTOMER_ROLE_CODE,
  CUSTOMER_ROLE_NAME,
} from '@/utils/permissions.constant';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { assert } from 'console';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import slugify from 'slugify';
import { EntityManager, FindOptionsWhere, In, Repository } from 'typeorm';
import { PermissionEntity } from '../permission/entities/permission.entity';
import { CreateRoleReqDto } from './dto/create-role.req.dto';
import { RoleResDto } from './dto/role.res.dto';
import { UpdateRoleReqDto } from './dto/update-role.req.dto';
import { RoleEntity } from './entities/role.entity';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);
  private readonly fullAccessPermissionKey = `${ADMIN_FULL_ACCESS.action}:${ADMIN_FULL_ACCESS.subject}`;

  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  private toRoleDto(role: RoleEntity): RoleResDto {
    return plainToInstance(RoleResDto, role, {
      excludeExtraneousValues: true,
    });
  }

  private assertAssignablePermissions(permissionEntities: PermissionEntity[]) {
    if (
      permissionEntities.some(
        (permission) => permission.key === this.fullAccessPermissionKey,
      )
    ) {
      throw new ValidationException(
        ErrorCode.V000,
        'manage:all cannot be assigned to roles',
      );
    }
  }

  private assertDomainPermissions(
    domain: DomainType,
    permissionEntities: PermissionEntity[],
  ) {
    const invalidPermissions = permissionEntities.filter(
      (permission) => permission.domain && permission.domain !== domain,
    );
    if (invalidPermissions.length > 0) {
      throw new ValidationException(
        ErrorCode.V000,
        `Permissions must belong to the ${domain} domain`,
      );
    }
  }

  private isProtectedRole(
    role: Pick<RoleEntity, 'isSystem' | 'name'> &
      Partial<Pick<RoleEntity, 'code'>>,
  ) {
    return (
      role.isSystem ||
      role.name === SYSTEM_ROLE_NAME ||
      role.name === CUSTOMER_ROLE_NAME ||
      role.code === 'super_admin' ||
      role.code === CUSTOMER_ROLE_CODE
    );
  }

  private assertMutableRole(
    role: Pick<RoleEntity, 'isSystem' | 'name'> &
      Partial<Pick<RoleEntity, 'code'>>,
  ) {
    if (this.isProtectedRole(role)) {
      throw new ValidationException(
        ErrorCode.V000,
        'System roles cannot be updated or deleted',
      );
    }
  }

  private assertNotReservedRoleName(name?: string) {
    if (!name) return;
    const trimmed = name.trim();
    if (
      trimmed.toUpperCase() === SYSTEM_ROLE_NAME ||
      trimmed.toLowerCase() === CUSTOMER_ROLE_NAME.toLowerCase()
    ) {
      throw new ValidationException(
        ErrorCode.V000,
        `${name} is a reserved role name`,
      );
    }
  }

  async findAll(query: PaginateQuery): Promise<Paginated<RoleResDto>> {
    const queryBuilder = this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissionEntities', 'permission');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: [
        'id',
        'name',
        'code',
        'domain',
        'description',
        'createdAt',
        'updatedAt',
      ],
      searchableColumns: ['name', 'code', 'description'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        name: [FilterOperator.ILIKE],
        code: [FilterOperator.ILIKE, FilterOperator.EQ],
        domain: [FilterOperator.EQ],
      },
    });

    return {
      ...result,
      data: plainToInstance(RoleResDto, result.data, {
        excludeExtraneousValues: true,
      }),
    } as Paginated<RoleResDto>;
  }

  async hasRole(): Promise<boolean> {
    const cacheKey = CacheKey.SYSTEM_HAS_ROLE;
    const cached = await this.cacheManager.get<boolean>(cacheKey);
    console.log('Cache store type:', this.cacheManager.constructor.name);

    if (cached !== undefined) {
      return cached;
    }

    const count = await this.roleRepository.count();
    const hasRole = count > 0;

    await this.cacheManager.set(cacheKey, hasRole, 60_000);

    return hasRole;
  }

  async createWithManager(
    manager: EntityManager,
    data: CreateRoleReqDto,
  ): Promise<RoleEntity> {
    const repo = manager.getRepository(RoleEntity);
    const permissionRepo = manager.getRepository(PermissionEntity);
    const permissionEntities = await permissionRepo.findBy({
      id: In(data.permissionIds),
    });
    if (permissionEntities.length !== data.permissionIds.length) {
      throw new ValidationException(ErrorCode.E002);
    }
    const domain = data.domain ?? DomainType.ADMIN;
    this.assertDomainPermissions(domain, permissionEntities);
    const code =
      slugify(data.name, {
        lower: true,
        strict: true,
        trim: true,
        replacement: '_',
      }) || 'role';
    const role = await repo.save(
      repo.create({
        name: data.name,
        code,
        description: data.description,
        isSystem: data.isSystem ?? false,
        domain,
        permissionEntities,
      }),
    );
    this.cacheManager.del(CacheKey.SYSTEM_HAS_ROLE);

    return role;
  }

  async create(dto: CreateRoleReqDto): Promise<RoleResDto> {
    this.assertNotReservedRoleName(dto.name);

    const domain = dto.domain ?? DomainType.ADMIN;

    const permissionEntities = await this.permissionRepository.findBy({
      id: In(dto.permissionIds),
    });
    if (permissionEntities.length !== dto.permissionIds.length) {
      throw new ValidationException(ErrorCode.E002);
    }
    this.assertAssignablePermissions(permissionEntities);
    this.assertDomainPermissions(domain, permissionEntities);

    const code =
      slugify(dto.name, {
        lower: true,
        strict: true,
        trim: true,
        replacement: '_',
      }) || 'role';

    const existingRole = await this.roleRepository.findOne({
      where: { code, domain },
    });
    if (existingRole) {
      throw new ConflictException(`Role with code '${code}' already exists`);
    }

    const newRole = new RoleEntity({
      name: dto.name,
      code,
      description: dto.description,
      isSystem: dto.isSystem ?? false,
      domain,
      permissionEntities,
    });

    const savedRole = await this.roleRepository.save(newRole);

    return this.toRoleDto(savedRole);
  }

  async findByNames(names: string[]): Promise<RoleEntity[]> {
    if (!names || names.length === 0) return [];
    return await this.roleRepository.find({
      where: { name: In(names) },
      relations: ['permissionEntities'],
    });
  }

  async findClientDefaultRole(): Promise<RoleEntity | null> {
    return await this.roleRepository.findOne({
      where: { code: CUSTOMER_ROLE_CODE, domain: DomainType.CLIENT },
      relations: ['permissionEntities'],
    });
  }

  async formOptions(domain?: DomainType): Promise<RoleResDto[]> {
    const where: FindOptionsWhere<RoleEntity> = {};
    if (domain) {
      where.domain = domain;
    }
    const query = await this.roleRepository.find({
      where,
      relations: ['permissionEntities'],
      order: {
        id: 'ASC',
      },
    });

    return plainToInstance(RoleResDto, query, {
      excludeExtraneousValues: true,
    });
  }

  async findOne(id: AutoIncrementID): Promise<RoleResDto> {
    assert(id, 'id is required');
    const role = await this.roleRepository.findOneOrFail({
      where: { id },
      relations: ['permissionEntities'],
    });
    return this.toRoleDto(role);
  }

  async update(
    id: AutoIncrementID,
    updateRoleDto: UpdateRoleReqDto,
  ): Promise<RoleResDto> {
    const role = await this.roleRepository.findOneOrFail({
      where: { id },
      relations: ['permissionEntities', 'users'],
    });

    this.assertMutableRole(role);
    this.assertNotReservedRoleName(updateRoleDto.name);

    const targetDomain = updateRoleDto.domain ?? role.domain;

    if (updateRoleDto.domain && updateRoleDto.domain !== role.domain) {
      if (role.users?.length > 0) {
        throw new ValidationException(
          ErrorCode.V000,
          'Cannot change domain of role assigned to users',
        );
      }
      role.domain = updateRoleDto.domain;
    }

    Object.assign(role, {
      ...(updateRoleDto.name !== undefined && { name: updateRoleDto.name }),
      ...(updateRoleDto.description !== undefined && {
        description: updateRoleDto.description,
      }),
      ...(updateRoleDto.isSystem !== undefined && {
        isSystem: updateRoleDto.isSystem,
      }),
    });

    if (updateRoleDto.permissionIds) {
      role.permissionEntities = await this.permissionRepository.findBy({
        id: In(updateRoleDto.permissionIds),
      });
      if (
        role.permissionEntities.length !== updateRoleDto.permissionIds.length
      ) {
        throw new ValidationException(ErrorCode.E002);
      }
      this.assertAssignablePermissions(role.permissionEntities);
      this.assertDomainPermissions(targetDomain, role.permissionEntities);
    } else if (updateRoleDto.domain && updateRoleDto.domain !== role.domain) {
      this.assertDomainPermissions(targetDomain, role.permissionEntities);
    }

    const savedRole = await this.roleRepository.save(role);

    return this.toRoleDto(savedRole);
  }

  async remove(id: AutoIncrementID) {
    const role = await this.roleRepository.findOneOrFail({
      where: { id },
      relations: ['users'],
    });
    this.assertMutableRole(role);
    if (role.users?.length > 0) {
      throw new ValidationException(
        ErrorCode.V000,
        'Role cannot be deleted while assigned to users',
      );
    }

    await this.roleRepository.softRemove(role);
  }
}
