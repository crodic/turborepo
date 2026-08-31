import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhiteLabelEntity } from './entities/white-label.entity';
import { WhiteLabelController } from './white-label.controller';
import { WhiteLabelService } from './white-label.service';

@Module({
  imports: [TypeOrmModule.forFeature([WhiteLabelEntity])],
  controllers: [WhiteLabelController],
  providers: [WhiteLabelService],
  exports: [WhiteLabelService],
})
export class WhiteLabelModule {}
