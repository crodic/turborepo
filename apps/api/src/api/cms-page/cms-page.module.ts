import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import {
  CmsPageAdminController,
  CmsPagePublicController,
} from './cms-page.controller';
import { CmsPageService } from './cms-page.service';
import { CmsPageEntity } from './entities/cms-page.entity';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([CmsPageEntity])],
  controllers: [CmsPageAdminController, CmsPagePublicController],
  providers: [CmsPageService],
})
export class CmsPageModule {}
