import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CityAdminController } from './controllers/city-admin.controller';
import { CountryAdminController } from './controllers/country-admin.controller';
import { LocationPublicController } from './controllers/location-public.controller';
import { RegionAdminController } from './controllers/region-admin.controller';
import { StateAdminController } from './controllers/state-admin.controller';
import { CityEntity } from './entities/city.entity';
import { CountryEntity } from './entities/country.entity';
import { RegionEntity } from './entities/region.entity';
import { StateEntity } from './entities/state.entity';
import { CityService } from './services/city.service';
import { CountryService } from './services/country.service';
import { RegionService } from './services/region.service';
import { StateService } from './services/state.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RegionEntity,
      CountryEntity,
      StateEntity,
      CityEntity,
    ]),
  ],
  controllers: [
    CountryAdminController,
    StateAdminController,
    CityAdminController,
    RegionAdminController,
    LocationPublicController,
  ],
  providers: [RegionService, CountryService, StateService, CityService],
  exports: [
    RegionService,
    CountryService,
    StateService,
    CityService,
    TypeOrmModule,
  ],
})
export class LocationModule {}
