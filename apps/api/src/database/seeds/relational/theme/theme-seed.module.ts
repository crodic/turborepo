import { SettingsModule } from '@/api/settings/settings.module';
import { ThemeEntity } from '@/api/theme/entities/theme.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThemeSeedService } from './theme-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([ThemeEntity]), SettingsModule],
  providers: [ThemeSeedService],
  exports: [ThemeSeedService],
})
export class ThemeSeedModule {}
