import { SettingEntity } from '@/api/settings/entities/setting.entity';
import { SettingKeys } from '@/api/settings/enums/setting-keys';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

const appSetting = {
  key: SettingKeys.WEBSITE,
  value: {
    site_brand: 'Crodic Framework',
    site_logo: null,
    site_dark_logo: null,
    site_favicon: null,
    site_title: 'Crodic Framework',
    site_tagline: 'Production-ready portal boilerplate',
    meta_title: 'Crodic Framework Admin Portal',
    meta_description:
      'A production-ready admin portal boilerplate for building modern applications.',
    canonical_url: null,
    og_title: 'Crodic Framework Admin Portal',
    og_description:
      'Manage operations, users, roles, themes, notifications, and runtime settings in one modern portal.',
    og_image: null,
    twitter_title: 'Crodic Framework Admin Portal',
    twitter_description:
      'A modern admin portal boilerplate for production-ready applications.',
    twitter_image: null,
  },
};

@Injectable()
export class SettingSeedService {
  constructor(
    @InjectRepository(SettingEntity)
    private readonly settingRepository: Repository<SettingEntity>,
  ) {}

  async run(customBrand?: string): Promise<void> {
    const brand = customBrand || appSetting.value.site_brand;
    const value = {
      ...appSetting.value,
      site_brand: brand,
      site_title: brand,
      meta_title: `${brand} Admin Portal`,
      og_title: `${brand} Admin Portal`,
      twitter_title: `${brand} Admin Portal`,
    };

    const existingSetting = await this.settingRepository.findOne({
      where: { key: appSetting.key },
    });

    if (existingSetting) {
      existingSetting.value = {
        ...(existingSetting.value as Record<string, any>),
        ...value,
      };
      await this.settingRepository.save(existingSetting);
      return;
    }

    await this.settingRepository.save(
      this.settingRepository.create({
        key: appSetting.key,
        value,
      }),
    );
  }
}
