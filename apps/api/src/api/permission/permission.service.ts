import { AutoIncrementID } from '@/common/types/common.type';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Not, Repository } from 'typeorm';
import { PermissionResDto } from './dto/permission.res.dto';
import { UpdatePermissionReqDto } from './dto/update-permission.req.dto';
import { PermissionEntity } from './entities/permission.entity';
import { FULL_ACCESS_PERMISSION_KEY, syncPermissions } from './permission-sync';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
  ) {}

  async formOptions(): Promise<PermissionResDto[]> {
    await syncPermissions(this.permissionRepository);

    const permissions = await this.permissionRepository.find({
      where: {
        key: Not(FULL_ACCESS_PERMISSION_KEY),
      },
      order: {
        key: 'ASC',
      },
    });

    return plainToInstance(PermissionResDto, permissions, {
      excludeExtraneousValues: true,
    });
  }

  async findAll(query: PaginateQuery): Promise<Paginated<PermissionResDto>> {
    await syncPermissions(this.permissionRepository);

    const queryBuilder =
      this.permissionRepository.createQueryBuilder('permission');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'key', 'name', 'group', 'createdAt', 'updatedAt'],
      searchableColumns: ['key', 'name', 'group', 'description'],
      defaultSortBy: [['id', 'ASC']],
      filterableColumns: {
        key: [FilterOperator.ILIKE],
        name: [FilterOperator.ILIKE],
        group: [FilterOperator.ILIKE],
      },
    });

    return {
      ...result,
      data: plainToInstance(PermissionResDto, result.data, {
        excludeExtraneousValues: true,
      }),
    } as Paginated<PermissionResDto>;
  }

  async findOne(id: AutoIncrementID): Promise<PermissionResDto> {
    const permission = await this.permissionRepository.findOneOrFail({
      where: { id },
    });

    return plainToInstance(PermissionResDto, permission, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: AutoIncrementID,
    dto: UpdatePermissionReqDto,
  ): Promise<PermissionResDto> {
    const permission = await this.permissionRepository.findOneOrFail({
      where: { id },
    });

    Object.assign(permission, {
      group: dto.group,
      description: dto.description,
    });

    const savedPermission = await this.permissionRepository.save(permission);

    return plainToInstance(PermissionResDto, savedPermission, {
      excludeExtraneousValues: true,
    });
  }
}
