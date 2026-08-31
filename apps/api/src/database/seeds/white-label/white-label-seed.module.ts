import { WhiteLabelEntity } from '@/api/white-label/entities/white-label.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhiteLabelSeedService } from './white-label-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([WhiteLabelEntity])],
  providers: [WhiteLabelSeedService],
  exports: [WhiteLabelSeedService],
})
export class WhiteLabelSeedModule {}
