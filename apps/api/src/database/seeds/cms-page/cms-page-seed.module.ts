import { CmsPageEntity } from '@/api/cms-page/entities/cms-page.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CmsPageSeedService } from './cms-page-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([CmsPageEntity])],
  providers: [CmsPageSeedService],
  exports: [CmsPageSeedService],
})
export class CmsPageSeedModule {}
