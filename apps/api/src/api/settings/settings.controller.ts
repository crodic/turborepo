import { ApiAuth } from '@/decorators/http.decorators';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';
import { SettingKeyValidationPipe } from '@/pipes/setting-key-validation.pipe';
import { deleteFile } from '@/utils/filesystem';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { join } from 'path';
import PackageJson from '../../../package.json';
import {
  WEBSITE_MAX_FILE_SIZE,
  websiteUploadOptions,
} from './configs/multer.config';
import { UpdateWebsiteSettingReqDto } from './dto/update-website-setting.req.dto';
import { WebsiteSettingResDto } from './dto/website-setting.res.dto';
import { SettingsService } from './settings.service';
import { ValidSettingKey } from './validations/valid-setting-key.validate';

@ApiTags('Settings')
@Controller({
  path: 'settings',
  version: '1',
})
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(':key')
  async getSettingByKey(
    @Param('key', SettingKeyValidationPipe) key: string,
  ): Promise<WebsiteSettingResDto> {
    if (!ValidSettingKey.isValid(key)) {
      throw new NotFoundException('Invalid key');
    }

    const setting = await this.settingsService.get<WebsiteSettingResDto>(
      key,
      {},
    );

    return this.toWebsiteSettingDto(setting);
  }

  @Post(':key')
  @ApiConsumes('multipart/form-data')
  @ApiAuth({
    summary: 'Update website settings',
    type: WebsiteSettingResDto,
  })
  @ApiBody({
    description: 'Upload a logo and favicon',
    schema: {
      type: 'object',
      properties: {
        site_logo: {
          type: 'string',
          format: 'binary',
        },
        site_dark_logo: {
          type: 'string',
          format: 'binary',
        },
        site_favicon: {
          type: 'string',
          format: 'binary',
        },
        site_brand: {
          type: 'string',
        },
        site_title: {
          type: 'string',
        },
        site_tagline: {
          type: 'string',
        },
        remove_site_logo: {
          type: 'boolean',
        },
        remove_site_dark_logo: {
          type: 'boolean',
        },
        remove_site_favicon: {
          type: 'boolean',
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'site_logo', maxCount: 1 },
        { name: 'site_dark_logo', maxCount: 1 },
        { name: 'site_favicon', maxCount: 1 },
      ],
      websiteUploadOptions,
    ),
  )
  @UseGuards(AdminAuthGuard)
  async updateWebsiteSetting(
    @Param('key', SettingKeyValidationPipe) key: string,
    @Body() dto: UpdateWebsiteSettingReqDto,
    @UploadedFiles()
    files: {
      site_logo?: Express.Multer.File[];
      site_dark_logo?: Express.Multer.File[];
      site_favicon?: Express.Multer.File[];
    } = {},
  ) {
    if (!ValidSettingKey.isValid(key)) {
      throw new NotFoundException('Invalid key');
    }

    this.validateWebsiteUploadFiles(files);

    const setting = await this.settingsService.get<WebsiteSettingResDto>(
      key,
      {},
    );
    const removeSiteLogo = this.isRemoveRequested(dto.remove_site_logo);
    const removeSiteDarkLogo = this.isRemoveRequested(
      dto.remove_site_dark_logo,
    );
    const removeSiteFavicon = this.isRemoveRequested(dto.remove_site_favicon);

    const payload = {
      site_brand: dto.site_brand,
      site_title: dto.site_title,
      site_tagline: dto.site_tagline,
      site_logo: this.resolveWebsiteAsset(
        files.site_logo?.[0],
        removeSiteLogo,
        setting.site_logo,
      ),
      site_dark_logo: this.resolveWebsiteAsset(
        files.site_dark_logo?.[0],
        removeSiteDarkLogo,
        setting.site_dark_logo,
      ),
      site_favicon: this.resolveWebsiteAsset(
        files.site_favicon?.[0],
        removeSiteFavicon,
        setting.site_favicon,
      ),
    };

    const newSetting = { ...setting, ...payload };
    await this.cleanupUnusedWebsiteAssets(setting, newSetting);
    await this.settingsService.set(key, newSetting);

    return this.toWebsiteSettingDto(newSetting);
  }

  private toWebsiteSettingDto(
    setting: WebsiteSettingResDto,
  ): WebsiteSettingResDto {
    return plainToInstance(
      WebsiteSettingResDto,
      {
        ...setting,
        backend_version: PackageJson.version,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  private getPublicUploadPath(file?: Express.Multer.File): string | undefined {
    if (!file) {
      return undefined;
    }

    return join('storage', 'public', 'website', file.filename).replaceAll(
      '\\',
      '/',
    );
  }

  private async cleanupUnusedWebsiteAssets(
    currentSetting: WebsiteSettingResDto,
    nextSetting: WebsiteSettingResDto,
  ): Promise<void> {
    await Promise.all([
      this.deleteUnusedWebsiteAsset(
        currentSetting.site_logo,
        nextSetting.site_logo,
      ),
      this.deleteUnusedWebsiteAsset(
        currentSetting.site_dark_logo,
        nextSetting.site_dark_logo,
      ),
      this.deleteUnusedWebsiteAsset(
        currentSetting.site_favicon,
        nextSetting.site_favicon,
      ),
    ]);
  }

  private async deleteUnusedWebsiteAsset(
    currentValue?: string | null,
    nextValue?: string | null,
  ): Promise<void> {
    if (!currentValue || currentValue === nextValue) {
      return;
    }

    const relativePath = this.getWebsiteAssetRelativePath(currentValue);

    if (!relativePath) {
      return;
    }

    await deleteFile(relativePath);
  }

  private getWebsiteAssetRelativePath(value: string): string | undefined {
    if (value.startsWith('http')) {
      return undefined;
    }

    const normalizedValue = value.startsWith('/') ? value.slice(1) : value;

    if (normalizedValue.startsWith('storage/public/website/')) {
      return normalizedValue;
    }

    if (normalizedValue.startsWith('uploads/website/')) {
      return join('public', normalizedValue);
    }

    return undefined;
  }

  private resolveWebsiteAsset(
    file: Express.Multer.File | undefined,
    shouldRemove: boolean | undefined,
    currentValue: string | undefined,
  ): string | null | undefined {
    const publicPath = this.getPublicUploadPath(file);

    if (publicPath) {
      return publicPath;
    }

    if (shouldRemove) {
      return null;
    }

    return currentValue;
  }

  private isRemoveRequested(value: boolean | string | undefined): boolean {
    return value === true || value === 'true';
  }

  private validateWebsiteUploadFiles(files: {
    site_logo?: Express.Multer.File[];
    site_dark_logo?: Express.Multer.File[];
    site_favicon?: Express.Multer.File[];
  }): void {
    const uploadedFiles = Object.values(files ?? {}).flatMap(
      (value) => value ?? [],
    );

    for (const file of uploadedFiles) {
      if (file.size > WEBSITE_MAX_FILE_SIZE) {
        throw new BadRequestException(
          `Validation failed (expected size is less than ${WEBSITE_MAX_FILE_SIZE})`,
        );
      }

      if (!['image/png', 'image/webp'].includes(file.mimetype)) {
        throw new BadRequestException(
          'Validation failed (expected type is PNG or WebP)',
        );
      }
    }
  }
}
