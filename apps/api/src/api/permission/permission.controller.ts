import { AutoIncrementID } from '@/common/types/common.type';
import { ApiAuth } from '@/decorators/http.decorators';
import { CheckAnyPolicies } from '@/decorators/policies.decorator';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { AppAbility } from '@/libs/casl/ability.factory';
import { AppActions, AppSubjects } from '@/utils/permissions.constant';
import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import {
  FilterOperator,
  Paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { PermissionResDto } from './dto/permission.res.dto';
import { UpdatePermissionReqDto } from './dto/update-permission.req.dto';
import { PermissionService } from './permission.service';

@ApiTags('Permissions')
@Controller({ path: 'permissions', version: '1' })
@UseGuards(AdminAuthGuard, PoliciesGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @ApiAuth({
    type: PermissionResDto,
    summary: 'Get paginated list of permissions',
    isPaginated: true,
    paginateOptions: {
      sortableColumns: ['id', 'key', 'name', 'group', 'createdAt', 'updatedAt'],
      defaultSortBy: [['id', 'ASC']],
      filterableColumns: {
        key: [FilterOperator.ILIKE],
        name: [FilterOperator.ILIKE],
        group: [FilterOperator.ILIKE],
      },
    },
  })
  @CheckAnyPolicies(
    (ability: AppAbility) => ability.can(AppActions.Read, AppSubjects.Role),
    (ability: AppAbility) => ability.can(AppActions.Update, AppSubjects.Role),
  )
  findAll(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<PermissionResDto>> {
    return this.permissionService.findAll(query);
  }

  @Get('form-options')
  @ApiAuth({
    type: PermissionResDto,
    summary: 'List all permissions',
  })
  @CheckAnyPolicies(
    (ability: AppAbility) => ability.can(AppActions.Read, AppSubjects.Role),
    (ability: AppAbility) => ability.can(AppActions.Create, AppSubjects.Role),
    (ability: AppAbility) => ability.can(AppActions.Update, AppSubjects.Role),
  )
  formOptions(): Promise<PermissionResDto[]> {
    return this.permissionService.formOptions();
  }

  @Get(':id')
  @ApiAuth({ type: PermissionResDto, summary: 'Find permission by id' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckAnyPolicies(
    (ability: AppAbility) => ability.can(AppActions.Read, AppSubjects.Role),
    (ability: AppAbility) => ability.can(AppActions.Update, AppSubjects.Role),
  )
  findOne(@Param('id') id: AutoIncrementID): Promise<PermissionResDto> {
    return this.permissionService.findOne(id);
  }

  @Put(':id')
  @ApiAuth({ type: PermissionResDto, summary: 'Update permission metadata' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckAnyPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.Role),
  )
  update(
    @Param('id') id: AutoIncrementID,
    @Body() dto: UpdatePermissionReqDto,
  ): Promise<PermissionResDto> {
    return this.permissionService.update(id, dto);
  }
}
