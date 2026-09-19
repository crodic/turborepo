import { AutoIncrementID } from '@/common/types/common.type';
import { ApiAuth } from '@/decorators/http.decorators';
import { CheckPolicies } from '@/decorators/policies.decorator';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { AppAbility } from '@/shared/casl/ability.factory';
import { AppActions, AppSubjects } from '@/utils/permissions.constant';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import {
  FilterOperator,
  Paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { CreateCityReqDto, UpdateCityReqDto } from '../dto/city.req.dto';
import { CityResDto } from '../dto/city.res.dto';
import { CityService } from '../services/city.service';

@ApiTags('Cities')
@Controller({ path: 'cities', version: '1' })
@UseGuards(AdminAuthGuard, PoliciesGuard)
export class CityAdminController {
  constructor(private readonly cityService: CityService) {}

  @Get()
  @ApiAuth({
    type: CityResDto,
    summary: 'Get paginated list of cities',
    isPaginated: true,
    paginateOptions: {
      sortableColumns: [
        'id',
        'name',
        'stateId',
        'stateCode',
        'countryId',
        'countryCode',
        'code',
        'createdAt',
        'updatedAt',
      ],
      defaultSortBy: [['name', 'ASC']],
      filterableColumns: {
        stateId: [FilterOperator.EQ],
        countryId: [FilterOperator.EQ],
        countryCode: [FilterOperator.EQ, FilterOperator.ILIKE],
        stateCode: [FilterOperator.EQ, FilterOperator.ILIKE],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    },
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Location),
  )
  findAll(@Paginate() query: PaginateQuery): Promise<Paginated<CityResDto>> {
    return this.cityService.findAll(query);
  }

  @Post()
  @ApiAuth({ type: CityResDto, summary: 'Create city' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.Location),
  )
  create(@Body() dto: CreateCityReqDto): Promise<CityResDto> {
    return this.cityService.create(dto);
  }

  @Get(':id')
  @ApiAuth({ type: CityResDto, summary: 'Find city by id' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Location),
  )
  findOne(@Param('id') id: AutoIncrementID): Promise<CityResDto> {
    return this.cityService.findOne(id);
  }

  @Put(':id')
  @ApiAuth({ type: CityResDto, summary: 'Update city' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.Location),
  )
  update(
    @Param('id') id: AutoIncrementID,
    @Body() dto: UpdateCityReqDto,
  ): Promise<CityResDto> {
    return this.cityService.update(id, dto);
  }

  @Delete(':id')
  @ApiAuth({ summary: 'Delete city' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Delete, AppSubjects.Location),
  )
  remove(@Param('id') id: AutoIncrementID): Promise<{ message: string }> {
    return this.cityService.remove(id);
  }
}
