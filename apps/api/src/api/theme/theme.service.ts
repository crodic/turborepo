import { SettingEntity } from '@/api/settings/entities/setting.entity';
import { SettingKeys } from '@/api/settings/enums/setting-keys';
import { AutoIncrementID } from '@/common/types/common.type';
import { EThemeStatus, EThemeTarget } from '@/constants/entity.enum';
import { ErrorCode } from '@/constants/error-code.constant';
import { ValidationException } from '@/exceptions/validation.exception';
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
import { IsNull, Not, Repository } from 'typeorm';
import { CreateThemeReqDto } from './dto/create-theme.req.dto';
import { isThemeStyles } from './dto/theme-style.dto';
import { ThemeResDto } from './dto/theme.res.dto';
import { UpdateThemeReqDto } from './dto/update-theme.req.dto';
import { ThemeEntity, ThemeStyles } from './entities/theme.entity';

type RuntimeThemeSettings = Partial<Record<EThemeTarget, AutoIncrementID>>;

@Injectable()
export class ThemeService {
  constructor(
    @InjectRepository(ThemeEntity)
    private readonly themeRepository: Repository<ThemeEntity>,
    @InjectRepository(SettingEntity)
    private readonly settingRepository: Repository<SettingEntity>,
  ) {}

  private toDto(
    theme: ThemeEntity,
    runtimeThemeIds: RuntimeThemeSettings = {},
  ): ThemeResDto {
    const id = String(theme.id);
    return plainToInstance(
      ThemeResDto,
      {
        ...theme,
        isAdminDefault: runtimeThemeIds[EThemeTarget.ADMIN]
          ? String(runtimeThemeIds[EThemeTarget.ADMIN]) === id
          : false,
        isClientDefault: runtimeThemeIds[EThemeTarget.CLIENT]
          ? String(runtimeThemeIds[EThemeTarget.CLIENT]) === id
          : false,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  private assertThemeStyles(styles: unknown): asserts styles is ThemeStyles {
    if (!isThemeStyles(styles)) {
      throw new ValidationException(ErrorCode.V000, 'Theme styles are invalid');
    }
  }

  private async buildUniqueSlug(name: string, ignoreId?: AutoIncrementID) {
    const baseSlug =
      slugify(name, { lower: true, strict: true, trim: true }) || 'theme';

    let slug = baseSlug;
    let index = 1;

    while (
      await this.themeRepository.exists({
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

  private async clearDefaultTheme(ignoreId?: AutoIncrementID) {
    const query = this.themeRepository
      .createQueryBuilder()
      .update(ThemeEntity)
      .set({ isDefault: false })
      .where('is_default = :isDefault', { isDefault: true });

    if (ignoreId) {
      query.andWhere('id != :id', { id: ignoreId });
    }

    await query.execute();
  }

  private async getRuntimeThemeSettings(): Promise<RuntimeThemeSettings> {
    const setting = await this.settingRepository.findOne({
      where: { key: SettingKeys.RUNTIME_THEMES },
    });

    return (setting?.value ?? {}) as RuntimeThemeSettings;
  }

  private async setRuntimeTheme(
    target: EThemeTarget,
    themeId: AutoIncrementID | null,
  ) {
    const value = await this.getRuntimeThemeSettings();

    if (themeId) {
      value[target] = themeId;
    } else {
      delete value[target];
    }

    let setting = await this.settingRepository.findOne({
      where: { key: SettingKeys.RUNTIME_THEMES },
    });

    if (!setting) {
      setting = this.settingRepository.create({
        key: SettingKeys.RUNTIME_THEMES,
        value,
      });
    } else {
      setting.value = value;
    }

    await this.settingRepository.save(setting);
  }

  private async resolveRuntimeThemeId(target: EThemeTarget) {
    const settings = await this.getRuntimeThemeSettings();
    return settings[target] ?? null;
  }

  private async applyRuntimeTargets(
    theme: ThemeEntity,
    dto: CreateThemeReqDto | UpdateThemeReqDto,
  ) {
    const setAdminDefault = dto.isAdminDefault ?? dto.isDefault;
    const setClientDefault = dto.isClientDefault;

    if (setAdminDefault !== undefined) {
      if (setAdminDefault) {
        if (theme.status !== EThemeStatus.PUBLISHED) {
          throw new ValidationException(
            ErrorCode.V000,
            'Only published themes can be set for admin portal',
          );
        }
        await this.clearDefaultTheme(theme.id);
        theme.isDefault = true;
        await this.setRuntimeTheme(EThemeTarget.ADMIN, theme.id);
      } else {
        const runtimeThemeId = await this.resolveRuntimeThemeId(
          EThemeTarget.ADMIN,
        );
        if (runtimeThemeId && String(runtimeThemeId) === String(theme.id)) {
          await this.setRuntimeTheme(EThemeTarget.ADMIN, null);
        }
        theme.isDefault = false;
      }
    }

    if (setClientDefault !== undefined) {
      if (setClientDefault) {
        if (theme.status !== EThemeStatus.PUBLISHED) {
          throw new ValidationException(
            ErrorCode.V000,
            'Only published themes can be set for client site',
          );
        }
        await this.setRuntimeTheme(EThemeTarget.CLIENT, theme.id);
      } else {
        const runtimeThemeId = await this.resolveRuntimeThemeId(
          EThemeTarget.CLIENT,
        );
        if (runtimeThemeId && String(runtimeThemeId) === String(theme.id)) {
          await this.setRuntimeTheme(EThemeTarget.CLIENT, null);
        }
      }
    }
  }

  async findAll(query: PaginateQuery): Promise<Paginated<ThemeResDto>> {
    const queryBuilder = this.themeRepository.createQueryBuilder('theme');
    const runtimeThemeIds = await this.getRuntimeThemeSettings();

    const result = await paginate(query, queryBuilder, {
      sortableColumns: [
        'id',
        'name',
        'slug',
        'status',
        'isDefault',
        'createdAt',
        'updatedAt',
      ],
      searchableColumns: ['name', 'slug', 'description'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        name: [FilterOperator.ILIKE],
        slug: [FilterOperator.ILIKE],
        status: [FilterOperator.EQ, FilterOperator.IN],
        isDefault: [FilterOperator.EQ],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE],
        updatedAt: [FilterOperator.GTE, FilterOperator.LTE],
      },
    });

    return {
      ...result,
      data: result.data.map((theme) => this.toDto(theme, runtimeThemeIds)),
    } as Paginated<ThemeResDto>;
  }

  async findOne(id: AutoIncrementID): Promise<ThemeResDto> {
    const theme = await this.themeRepository.findOneOrFail({ where: { id } });
    return this.toDto(theme, await this.getRuntimeThemeSettings());
  }

  async getCurrentRuntimeTheme(
    target: EThemeTarget = EThemeTarget.ADMIN,
  ): Promise<ThemeResDto | null> {
    const runtimeThemeId = await this.resolveRuntimeThemeId(target);

    if (!runtimeThemeId && target === EThemeTarget.CLIENT) {
      return null;
    }

    if (!runtimeThemeId) {
      return null;
    }

    const theme = await this.themeRepository.findOne({
      where: { id: runtimeThemeId, status: EThemeStatus.PUBLISHED },
    });

    return theme
      ? this.toDto(theme, await this.getRuntimeThemeSettings())
      : null;
  }

  async create(
    dto: CreateThemeReqDto,
    adminId?: AutoIncrementID,
  ): Promise<ThemeResDto> {
    this.assertThemeStyles(dto.styles);

    const theme = this.themeRepository.create({
      name: dto.name,
      slug: await this.buildUniqueSlug(dto.name),
      description: dto.description ?? null,
      styles: dto.styles,
      status: dto.status ?? EThemeStatus.DRAFT,
      isDefault: false,
      createdByAdminId: adminId,
      updatedByAdminId: adminId,
    });

    const savedTheme = await this.themeRepository.save(theme);
    await this.applyRuntimeTargets(savedTheme, dto);

    return this.toDto(
      await this.themeRepository.save(savedTheme),
      await this.getRuntimeThemeSettings(),
    );
  }

  async update(
    id: AutoIncrementID,
    dto: UpdateThemeReqDto,
    adminId?: AutoIncrementID,
  ): Promise<ThemeResDto> {
    const theme = await this.themeRepository.findOneOrFail({ where: { id } });

    if (dto.styles !== undefined) {
      this.assertThemeStyles(dto.styles);
      theme.styles = dto.styles;
    }

    if (dto.name !== undefined) {
      theme.name = dto.name;
      theme.slug = await this.buildUniqueSlug(dto.name, id);
    }

    if (dto.description !== undefined) {
      theme.description = dto.description ?? null;
    }

    if (dto.status !== undefined) {
      theme.status = dto.status;
      if (dto.status === EThemeStatus.DRAFT) {
        theme.isDefault = false;
        const runtimeThemeIds = await this.getRuntimeThemeSettings();
        if (String(runtimeThemeIds[EThemeTarget.ADMIN]) === String(theme.id)) {
          await this.setRuntimeTheme(EThemeTarget.ADMIN, null);
        }
        if (String(runtimeThemeIds[EThemeTarget.CLIENT]) === String(theme.id)) {
          await this.setRuntimeTheme(EThemeTarget.CLIENT, null);
        }
      }
    }

    if (dto.isDefault !== undefined) {
      dto.isAdminDefault = dto.isDefault;
    }

    theme.updatedByAdminId = adminId;
    await this.applyRuntimeTargets(theme, dto);

    return this.toDto(
      await this.themeRepository.save(theme),
      await this.getRuntimeThemeSettings(),
    );
  }

  async remove(id: AutoIncrementID): Promise<void> {
    const theme = await this.themeRepository.findOneOrFail({ where: { id } });
    await this.themeRepository.softRemove(theme);
  }

  async duplicate(
    id: AutoIncrementID,
    adminId?: AutoIncrementID,
  ): Promise<ThemeResDto> {
    const theme = await this.themeRepository.findOneOrFail({ where: { id } });
    const name = `${theme.name} Copy`;

    const duplicatedTheme = this.themeRepository.create({
      name,
      slug: await this.buildUniqueSlug(name),
      description: theme.description,
      styles: theme.styles,
      status: EThemeStatus.DRAFT,
      isDefault: false,
      createdByAdminId: adminId,
      updatedByAdminId: adminId,
    });

    return this.toDto(
      await this.themeRepository.save(duplicatedTheme),
      await this.getRuntimeThemeSettings(),
    );
  }

  async publish(
    id: AutoIncrementID,
    target: EThemeTarget,
    adminId?: AutoIncrementID,
  ): Promise<ThemeResDto> {
    const theme = await this.themeRepository.findOneOrFail({ where: { id } });

    if (theme.status !== EThemeStatus.PUBLISHED) {
      throw new ValidationException(
        ErrorCode.V000,
        'Only published themes can be set for runtime',
      );
    }

    theme.updatedByAdminId = adminId;

    if (target === EThemeTarget.ADMIN) {
      await this.clearDefaultTheme(id);
      theme.isDefault = true;
    }

    await this.setRuntimeTheme(target, id);

    return this.toDto(
      await this.themeRepository.save(theme),
      await this.getRuntimeThemeSettings(),
    );
  }

  async unpublish(
    id: AutoIncrementID,
    target?: EThemeTarget,
    adminId?: AutoIncrementID,
  ): Promise<ThemeResDto> {
    const theme = await this.themeRepository.findOneOrFail({ where: { id } });

    if (!target || target === EThemeTarget.ADMIN) {
      const adminThemeId = await this.resolveRuntimeThemeId(EThemeTarget.ADMIN);
      if (adminThemeId && String(adminThemeId) === String(id)) {
        await this.setRuntimeTheme(EThemeTarget.ADMIN, null);
        theme.isDefault = false;
      }
    }

    if (!target || target === EThemeTarget.CLIENT) {
      const clientThemeId = await this.resolveRuntimeThemeId(
        EThemeTarget.CLIENT,
      );
      if (clientThemeId && String(clientThemeId) === String(id)) {
        await this.setRuntimeTheme(EThemeTarget.CLIENT, null);
      }
    }

    theme.updatedByAdminId = adminId;

    return this.toDto(
      await this.themeRepository.save(theme),
      await this.getRuntimeThemeSettings(),
    );
  }
}
