import { ThemeEntity } from '@/api/theme/entities/theme.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThemeSeedService } from './theme-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([ThemeEntity])],
  providers: [ThemeSeedService],
  exports: [ThemeSeedService],
})
export class ThemeSeedModule {}
