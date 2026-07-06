import { SettingsModule } from '@/api/settings/settings.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThemeEntity } from './entities/theme.entity';
import { ThemeController } from './theme.controller';
import { ThemeService } from './theme.service';

@Module({
  imports: [SettingsModule, TypeOrmModule.forFeature([ThemeEntity])],
  controllers: [ThemeController],
  providers: [ThemeService],
  exports: [ThemeService],
})
export class ThemeModule {}
