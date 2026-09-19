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
import { CityResDto } from '../dto/city.res.dto';
import { CreateStateReqDto, UpdateStateReqDto } from '../dto/state.req.dto';
import { StateResDto } from '../dto/state.res.dto';
import { StateService } from '../services/state.service';

@ApiTags('States')
@Controller({ path: 'states', version: '1' })
@UseGuards(AdminAuthGuard, PoliciesGuard)
export class StateAdminController {
  constructor(private readonly stateService: StateService) {}

  @Get()
  @ApiAuth({
    type: StateResDto,
    summary: 'Get paginated list of states',
    isPaginated: true,
    paginateOptions: {
      sortableColumns: [
        'id',
        'name',
        'countryId',
        'countryCode',
        'type',
        'iso2',
        'createdAt',
        'updatedAt',
      ],
      defaultSortBy: [['name', 'ASC']],
      filterableColumns: {
        countryId: [FilterOperator.EQ],
        countryCode: [FilterOperator.EQ, FilterOperator.ILIKE],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    },
  })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Location),
  )
  findAll(@Paginate() query: PaginateQuery): Promise<Paginated<StateResDto>> {
    return this.stateService.findAll(query);
  }

  @Post()
  @ApiAuth({ type: StateResDto, summary: 'Create state' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Create, AppSubjects.Location),
  )
  create(@Body() dto: CreateStateReqDto): Promise<StateResDto> {
    return this.stateService.create(dto);
  }

  @Get(':id')
  @ApiAuth({ type: StateResDto, summary: 'Find state by id' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Location),
  )
  findOne(@Param('id') id: AutoIncrementID): Promise<StateResDto> {
    return this.stateService.findOne(id);
  }

  @Get(':id/cities')
  @ApiAuth({ type: CityResDto, summary: 'Get cities of state' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Read, AppSubjects.Location),
  )
  findCities(@Param('id') id: AutoIncrementID): Promise<CityResDto[]> {
    return this.stateService.findCitiesByState(id);
  }

  @Put(':id')
  @ApiAuth({ type: StateResDto, summary: 'Update state' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Update, AppSubjects.Location),
  )
  update(
    @Param('id') id: AutoIncrementID,
    @Body() dto: UpdateStateReqDto,
  ): Promise<StateResDto> {
    return this.stateService.update(id, dto);
  }

  @Delete(':id')
  @ApiAuth({ summary: 'Delete state' })
  @ApiParam({ name: 'id', type: 'String' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can(AppActions.Delete, AppSubjects.Location),
  )
  remove(@Param('id') id: AutoIncrementID): Promise<{ message: string }> {
    return this.stateService.remove(id);
  }
}
