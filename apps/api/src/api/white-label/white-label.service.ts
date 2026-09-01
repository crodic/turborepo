import { AutoIncrementID } from '@/common/types/common.type';
import { EWhiteLabelTarget } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { FilesystemService } from '@/filesystem/filesystem.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import slugify from 'slugify';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import { ActiveWhiteLabelResDto } from './dto/active-white-label.res.dto';
import { CreateWhiteLabelReqDto } from './dto/create-white-label.req.dto';
import { UpdateWhiteLabelReqDto } from './dto/update-white-label.req.dto';
import { isWhiteLabelStyles } from './dto/white-label-style.dto';
import { WhiteLabelResDto } from './dto/white-label.res.dto';
import {
  WhiteLabelEntity,
  WhiteLabelStyles,
} from './entities/white-label.entity';

export type WhiteLabelUploadFiles = {
  site_logo?: Express.Multer.File[];
  site_dark_logo?: Express.Multer.File[];
  site_favicon?: Express.Multer.File[];
  og_image?: Express.Multer.File[];
  twitter_image?: Express.Multer.File[];
};

@Injectable()
export class WhiteLabelService {
  private readonly uploadFolder = 'white-label';

  constructor(
    @InjectRepository(WhiteLabelEntity)
    private readonly whiteLabelRepository: Repository<WhiteLabelEntity>,
    private readonly dataSource: DataSource,
    private readonly storage: FilesystemService,
  ) {}

  private toDto(whiteLabel: WhiteLabelEntity): WhiteLabelResDto {
    return plainToInstance(WhiteLabelResDto, whiteLabel, {
      excludeExtraneousValues: true,
    });
  }

  private toActiveDto(whiteLabel: WhiteLabelEntity): ActiveWhiteLabelResDto {
    return plainToInstance(ActiveWhiteLabelResDto, whiteLabel, {
      excludeExtraneousValues: true,
    });
  }

  private assertStyles(styles: unknown): asserts styles is WhiteLabelStyles {
    if (!isWhiteLabelStyles(styles)) {
      throw new ValidationException(
        ErrorCode.V000,
        'White label styles are invalid',
      );
    }
  }

  private async buildUniqueSlug(name: string, ignoreId?: AutoIncrementID) {
    const baseSlug =
      slugify(name, { lower: true, strict: true, trim: true }) || 'brand';

    let slug = baseSlug;
    let index = 1;

    while (
      await this.whiteLabelRepository.exists({
        where: {
          slug,
          deletedAt: IsNull(),
          ...(ignoreId ? { id: Not(ignoreId) } : {}),
        },
      })
    ) {
      index += 1;
      slug = `${baseSlug}-${index}`;
    }

    return slug;
  }

  private getPublicUploadPath(file?: Express.Multer.File): string | undefined {
    if (!file) {
      return undefined;
    }

    return this.storage
      .disk('public')
      .url(`${this.uploadFolder}/${file.filename}`);
  }

  private resolveAsset(
    file: Express.Multer.File | undefined,
    shouldRemove: boolean | undefined,
    currentValue: string | null | undefined,
  ): string | null | undefined {
    const publicPath = this.getPublicUploadPath(file);
    if (publicPath) return publicPath;
    if (shouldRemove) return null;
    return currentValue;
  }

  private async cleanupUnusedAsset(
    currentValue?: string | null,
    nextValue?: string | null,
  ): Promise<void> {
    if (!currentValue || currentValue === nextValue) return;

    let relativePath: string | null = null;
    const folderPrefix = `${this.uploadFolder}/`;
    if (currentValue.includes(folderPrefix)) {
      const parts = currentValue.split(folderPrefix);
      const filename = parts[parts.length - 1]?.split('?')[0]?.split('#')[0];
      if (filename) {
        relativePath = `${this.uploadFolder}/${filename}`;
      }
    }

    if (relativePath) {
      try {
        await this.storage.disk('public').delete(relativePath);
      } catch {
        // Ignore deletion errors gracefully
      }
    }
  }

  async findAll(query: PaginateQuery): Promise<Paginated<WhiteLabelResDto>> {
    const queryBuilder =
      this.whiteLabelRepository.createQueryBuilder('white_label');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: [
        'id',
        'name',
        'slug',
        'target',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
      searchableColumns: ['name', 'slug', 'description', 'brandName'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        name: [FilterOperator.ILIKE],
        slug: [FilterOperator.ILIKE],
        target: [FilterOperator.EQ, FilterOperator.IN],
        isActive: [FilterOperator.EQ],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE],
        updatedAt: [FilterOperator.GTE, FilterOperator.LTE],
      },
    });

    return {
      ...result,
      data: result.data.map((item) => this.toDto(item)),
    } as Paginated<WhiteLabelResDto>;
  }

  async findOne(id: AutoIncrementID): Promise<WhiteLabelResDto> {
    const item = await this.whiteLabelRepository.findOneOrFail({
      where: { id },
    });
    return this.toDto(item);
  }

  async getActiveWhiteLabel(
    target: EWhiteLabelTarget = EWhiteLabelTarget.ADMIN,
  ): Promise<ActiveWhiteLabelResDto | null> {
    const active = await this.whiteLabelRepository.findOne({
      where: { target, isActive: true },
    });

    if (active) {
      return this.toActiveDto(active);
    }

    const fallback = await this.whiteLabelRepository.findOne({
      where: { target },
      order: { createdAt: 'ASC' },
    });

    return fallback ? this.toActiveDto(fallback) : null;
  }

  async create(
    dto: CreateWhiteLabelReqDto,
    files: WhiteLabelUploadFiles = {},
    adminId?: AutoIncrementID,
  ): Promise<WhiteLabelResDto> {
    this.assertStyles(dto.styles);

    const target = dto.target ?? EWhiteLabelTarget.ADMIN;
    const isActive = Boolean(dto.isActive);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (isActive) {
        await queryRunner.manager.update(
          WhiteLabelEntity,
          { target, isActive: true },
          { isActive: false },
        );
      }

      const entity = queryRunner.manager.create(WhiteLabelEntity, {
        name: dto.name,
        slug: await this.buildUniqueSlug(dto.name),
        description: dto.description ?? null,
        target,
        isActive,
        brandName: dto.brandName ?? null,
        siteTitle: dto.siteTitle ?? null,
        siteTagline: dto.siteTagline ?? null,
        copyrightText: dto.copyrightText ?? null,
        metaTitle: dto.metaTitle ?? null,
        metaDescription: dto.metaDescription ?? null,
        canonicalUrl: dto.canonicalUrl ?? null,
        styles: dto.styles,
        siteLogo: this.resolveAsset(files.site_logo?.[0], false, null),
        siteDarkLogo: this.resolveAsset(files.site_dark_logo?.[0], false, null),
        siteFavicon: this.resolveAsset(files.site_favicon?.[0], false, null),
        ogImage: this.resolveAsset(files.og_image?.[0], false, null),
        twitterImage: this.resolveAsset(files.twitter_image?.[0], false, null),
        createdByAdminId: adminId,
        updatedByAdminId: adminId,
      });

      const saved = await queryRunner.manager.save(entity);
      await queryRunner.commitTransaction();

      return this.toDto(saved);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async update(
    id: AutoIncrementID,
    dto: UpdateWhiteLabelReqDto,
    files: WhiteLabelUploadFiles = {},
    adminId?: AutoIncrementID,
  ): Promise<WhiteLabelResDto> {
    const existing = await this.whiteLabelRepository.findOneOrFail({
      where: { id },
    });

    if (dto.styles !== undefined) {
      this.assertStyles(dto.styles);
      existing.styles = dto.styles;
    }

    if (dto.name !== undefined) {
      existing.name = dto.name;
      existing.slug = await this.buildUniqueSlug(dto.name, id);
    }

    if (dto.description !== undefined) {
      existing.description = dto.description ?? null;
    }

    if (dto.brandName !== undefined) {
      existing.brandName = dto.brandName ?? null;
    }

    if (dto.siteTitle !== undefined) {
      existing.siteTitle = dto.siteTitle ?? null;
    }

    if (dto.siteTagline !== undefined) {
      existing.siteTagline = dto.siteTagline ?? null;
    }

    if (dto.copyrightText !== undefined) {
      existing.copyrightText = dto.copyrightText ?? null;
    }

    if (dto.metaTitle !== undefined) {
      existing.metaTitle = dto.metaTitle ?? null;
    }

    if (dto.metaDescription !== undefined) {
      existing.metaDescription = dto.metaDescription ?? null;
    }

    if (dto.canonicalUrl !== undefined) {
      existing.canonicalUrl = dto.canonicalUrl ?? null;
    }

    const nextTarget = dto.target ?? existing.target;
    existing.target = nextTarget;

    const nextSiteLogo = this.resolveAsset(
      files.site_logo?.[0],
      dto.remove_site_logo,
      existing.siteLogo,
    );
    const nextSiteDarkLogo = this.resolveAsset(
      files.site_dark_logo?.[0],
      dto.remove_site_dark_logo,
      existing.siteDarkLogo,
    );
    const nextSiteFavicon = this.resolveAsset(
      files.site_favicon?.[0],
      dto.remove_site_favicon,
      existing.siteFavicon,
    );
    const nextOgImage = this.resolveAsset(
      files.og_image?.[0],
      dto.remove_og_image,
      existing.ogImage,
    );
    const nextTwitterImage = this.resolveAsset(
      files.twitter_image?.[0],
      dto.remove_twitter_image,
      existing.twitterImage,
    );

    await Promise.all([
      this.cleanupUnusedAsset(existing.siteLogo, nextSiteLogo),
      this.cleanupUnusedAsset(existing.siteDarkLogo, nextSiteDarkLogo),
      this.cleanupUnusedAsset(existing.siteFavicon, nextSiteFavicon),
      this.cleanupUnusedAsset(existing.ogImage, nextOgImage),
      this.cleanupUnusedAsset(existing.twitterImage, nextTwitterImage),
    ]);

    existing.siteLogo = nextSiteLogo;
    existing.siteDarkLogo = nextSiteDarkLogo;
    existing.siteFavicon = nextSiteFavicon;
    existing.ogImage = nextOgImage;
    existing.twitterImage = nextTwitterImage;
    existing.updatedByAdminId = adminId;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.isActive !== undefined) {
        if (dto.isActive) {
          await queryRunner.manager.update(
            WhiteLabelEntity,
            { target: nextTarget, isActive: true },
            { isActive: false },
          );
          existing.isActive = true;
        } else {
          existing.isActive = false;
        }
      }

      const saved = await queryRunner.manager.save(existing);
      await queryRunner.commitTransaction();

      return this.toDto(saved);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async activate(
    id: AutoIncrementID,
    adminId?: AutoIncrementID,
  ): Promise<WhiteLabelResDto> {
    const item = await this.whiteLabelRepository.findOneOrFail({
      where: { id },
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(
        WhiteLabelEntity,
        { target: item.target, isActive: true },
        { isActive: false },
      );

      item.isActive = true;
      item.updatedByAdminId = adminId;
      const saved = await queryRunner.manager.save(item);

      await queryRunner.commitTransaction();
      return this.toDto(saved);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deactivate(
    id: AutoIncrementID,
    adminId?: AutoIncrementID,
  ): Promise<WhiteLabelResDto> {
    const item = await this.whiteLabelRepository.findOneOrFail({
      where: { id },
    });

    item.isActive = false;
    item.updatedByAdminId = adminId;

    const saved = await this.whiteLabelRepository.save(item);
    return this.toDto(saved);
  }

  async duplicate(
    id: AutoIncrementID,
    adminId?: AutoIncrementID,
  ): Promise<WhiteLabelResDto> {
    const source = await this.whiteLabelRepository.findOneOrFail({
      where: { id },
    });

    const name = `${source.name} Copy`;
    const duplicated = this.whiteLabelRepository.create({
      ...source,
      id: undefined,
      name,
      slug: await this.buildUniqueSlug(name),
      isActive: false,
      createdByAdminId: adminId,
      updatedByAdminId: adminId,
    });

    const saved = await this.whiteLabelRepository.save(duplicated);
    return this.toDto(saved);
  }

  async remove(id: AutoIncrementID): Promise<void> {
    const item = await this.whiteLabelRepository.findOneOrFail({
      where: { id },
    });

    if (item.isActive) {
      item.isActive = false;
      await this.whiteLabelRepository.save(item);
    }

    await this.whiteLabelRepository.softRemove(item);
  }
}
