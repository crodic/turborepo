import { Module } from '@nestjs/common';
import { LocationSeedService } from './location-seed.service';

@Module({
  providers: [LocationSeedService],
  exports: [LocationSeedService],
})
export class LocationSeedModule {}
