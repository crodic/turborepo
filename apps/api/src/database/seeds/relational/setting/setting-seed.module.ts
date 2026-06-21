import { SettingEntity } from '@/api/settings/entities/setting.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingSeedService } from './setting-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([SettingEntity])],
  providers: [SettingSeedService],
  exports: [SettingSeedService],
})
export class SettingSeedModule {}
