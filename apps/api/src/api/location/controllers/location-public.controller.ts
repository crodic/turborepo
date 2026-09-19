import { AutoIncrementID } from '@/common/types/common.type';
import { ApiPublic } from '@/decorators/http.decorators';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CityResDto } from '../dto/city.res.dto';
import { CountryResDto } from '../dto/country.res.dto';
import { RegionResDto } from '../dto/region.res.dto';
import { StateResDto } from '../dto/state.res.dto';
import { CityService } from '../services/city.service';
import { CountryService } from '../services/country.service';
import { RegionService } from '../services/region.service';
import { StateService } from '../services/state.service';

@ApiTags('Public Locations')
@Controller({ path: 'public/locations', version: '1' })
export class LocationPublicController {
  constructor(
    private readonly regionService: RegionService,
    private readonly countryService: CountryService,
    private readonly stateService: StateService,
    private readonly cityService: CityService,
  ) {}

  @Get('regions')
  @ApiPublic({
    type: RegionResDto,
    summary: 'List all regions for selection',
  })
  getRegions(): Promise<RegionResDto[]> {
    return this.regionService.listAll();
  }

  @Get('countries')
  @ApiPublic({
    type: CountryResDto,
    summary: 'List all countries for selection',
  })
  @ApiQuery({ name: 'regionId', required: false, type: String })
  getCountries(
    @Query('regionId') regionId?: AutoIncrementID,
  ): Promise<CountryResDto[]> {
    return this.countryService.listAll(regionId);
  }

  @Get('countries/:countryId/states')
  @ApiPublic({
    type: StateResDto,
    summary: 'List states of a specific country',
  })
  @ApiParam({ name: 'countryId', type: String })
  getStates(
    @Param('countryId') countryId: AutoIncrementID,
  ): Promise<StateResDto[]> {
    return this.stateService.listByCountry(countryId);
  }

  @Get('states/:stateId/cities')
  @ApiPublic({
    type: CityResDto,
    summary: 'List cities of a specific state',
  })
  @ApiParam({ name: 'stateId', type: String })
  getCities(@Param('stateId') stateId: AutoIncrementID): Promise<CityResDto[]> {
    return this.cityService.listByState(stateId);
  }
}
