import { AutoIncrementID } from '@/common/types/common.type';
import { SYSTEM_ROLE_NAME } from '@/constants/app.constant';
import { CacheKey } from '@/constants/cache.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { ADMIN_FULL_ACCESS } from '@/utils/permissions.constant';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { assert } from 'console';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { EntityManager, In, Repository } from 'typeorm';
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

  private isProtectedRole(role: Pick<RoleEntity, 'isSystem' | 'name'>) {
    return role.isSystem || role.name === SYSTEM_ROLE_NAME;
  }

  private assertMutableRole(role: Pick<RoleEntity, 'isSystem' | 'name'>) {
    if (this.isProtectedRole(role)) {
      throw new ValidationException(
        ErrorCode.V000,
        'System roles cannot be updated or deleted',
      );
    }
  }

  private assertNotReservedRoleName(name?: string) {
    if (name === SYSTEM_ROLE_NAME) {
      throw new ValidationException(
        ErrorCode.V000,
        `${SYSTEM_ROLE_NAME} is a reserved role name`,
      );
    }
  }

  async findAll(query: PaginateQuery): Promise<Paginated<RoleResDto>> {
    const queryBuilder = this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissionEntities', 'permission');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'name', 'description', 'createdAt', 'updatedAt'],
      searchableColumns: ['name', 'description'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        name: [FilterOperator.ILIKE],
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
    const role = await repo.save(
      repo.create({
        name: data.name,
        description: data.description,
        isSystem: data.isSystem ?? false,
        permissionEntities,
      }),
    );
    this.cacheManager.del(CacheKey.SYSTEM_HAS_ROLE);

    return role;
  }

  async create(dto: CreateRoleReqDto): Promise<RoleResDto> {
    this.assertNotReservedRoleName(dto.name);

    const permissionEntities = await this.permissionRepository.findBy({
      id: In(dto.permissionIds),
    });
    if (permissionEntities.length !== dto.permissionIds.length) {
      throw new ValidationException(ErrorCode.E002);
    }
    this.assertAssignablePermissions(permissionEntities);

    const newRole = new RoleEntity({
      name: dto.name,
      description: dto.description,
      isSystem: dto.isSystem ?? false,
      permissionEntities,
    });

    const savedRole = await this.roleRepository.save(newRole);

    // this.logger.debug(savedRole);

    return this.toRoleDto(savedRole);
  }

  async formOptions(): Promise<RoleResDto[]> {
    const query = await this.roleRepository.find({
      relations: ['permissionEntities'],
    });

    console.log(query);

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
      relations: ['permissionEntities'],
    });

    this.assertMutableRole(role);
    this.assertNotReservedRoleName(updateRoleDto.name);

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
    }

    const savedRole = await this.roleRepository.save(role);

    return this.toRoleDto(savedRole);
  }

  async remove(id: AutoIncrementID) {
    const role = await this.roleRepository.findOneOrFail({
      where: { id },
      relations: ['admins'],
    });
    this.assertMutableRole(role);
    if (role.admins?.length > 0) {
      throw new ValidationException(
        ErrorCode.V000,
        'Role cannot be deleted while assigned to admins',
      );
    }

    await this.roleRepository.softRemove(role);
  }
}
