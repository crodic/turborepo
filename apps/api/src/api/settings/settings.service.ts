import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingEntity } from './entities/setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SettingEntity)
    private readonly repo: Repository<SettingEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  async get<TData>(key: string, defaultValue: TData = null): Promise<TData> {
    const cacheKey = `app_settings.${key}`;

    const cached = await this.cache.get<TData>(cacheKey);
    if (cached !== undefined) return cached;

    const row = await this.repo.findOne({ where: { key } });
    const val = row?.value ?? defaultValue;

    await this.cache.set(cacheKey, val, 3600);
    return val as TData;
  }

  async set(key: string, value: any) {
    let row = await this.repo.findOne({ where: { key } });
    if (!row) row = this.repo.create({ key, value });
    else row.value = value;

    await this.repo.save(row);
    await this.cache.del(`app_settings.${key}`);
    return true;
  }
}
