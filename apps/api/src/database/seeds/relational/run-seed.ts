import { NestFactory } from '@nestjs/core';
import { CmsPageSeedService } from './cms-page/cms-page-seed.service';
import { SeedModule } from './seed.module';
import { SettingSeedService } from './setting/setting-seed.service';
import { ThemeSeedService } from './theme/theme-seed.service';
import { UserSeedService } from './user/user-seed.service';

const runSeed = async () => {
  const app = await NestFactory.create(SeedModule);

  await app.get(UserSeedService).run();
  await app.get(SettingSeedService).run();
  await app.get(ThemeSeedService).run();
  await app.get(AdminSeedService).run();
  await app.get(CmsPageSeedService).run();

  await app.close();
};

void runSeed();
