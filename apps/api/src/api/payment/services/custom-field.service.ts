import { AutoIncrementID } from '@/common/types/common.type';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { CreateCustomFieldReqDto } from '../dto/create-custom-field.req.dto';
import { PolarCustomFieldResDto } from '../dto/polar-custom-field.res.dto';
import { UpdateCustomFieldReqDto } from '../dto/update-custom-field.req.dto';
import {
  PolarCustomFieldEntity,
  PolarCustomFieldType,
} from '../entities/polar-custom-field.entity';
import { PolarService } from './polar.service';

@Injectable()
export class CustomFieldService {
  private readonly logger = new Logger(CustomFieldService.name);

  constructor(
    @InjectRepository(PolarCustomFieldEntity)
    private readonly customFieldRepo: Repository<PolarCustomFieldEntity>,
    private readonly polarService: PolarService,
  ) {}

  async getAdminCustomFields(
    query: PaginateQuery,
  ): Promise<Paginated<PolarCustomFieldResDto>> {
    const queryBuilder = this.customFieldRepo.createQueryBuilder('cf');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'name', 'slug', 'type', 'createdAt'],
      searchableColumns: ['name', 'slug', 'polarCustomFieldId'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        type: [FilterOperator.EQ],
        slug: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });

    return {
      ...result,
      data: plainToInstance(PolarCustomFieldResDto, result.data),
    } as Paginated<PolarCustomFieldResDto>;
  }

  async getCustomFieldById(
    id: AutoIncrementID,
  ): Promise<PolarCustomFieldResDto> {
    const cf = await this.customFieldRepo.findOne({ where: { id } });
    if (!cf) {
      throw new NotFoundException(`Custom field with ID #${id} not found.`);
    }
    return plainToInstance(PolarCustomFieldResDto, cf);
  }

  async createCustomField(
    dto: CreateCustomFieldReqDto,
  ): Promise<PolarCustomFieldResDto> {
    // Sanitize slug: lowercase, ASCII letters, numbers, and hyphens only
    const sanitizedSlug = dto.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    this.logger.log(
      `Creating custom field "${dto.name}" (${sanitizedSlug})...`,
    );

    // Ensure properties object has valid structure for Polar SDK
    const properties: any = {
      form_label: dto.name,
      formLabel: dto.name,
      ...(dto.properties || {}),
    };

    if (
      dto.type === 'select' &&
      (!properties.options || !Array.isArray(properties.options))
    ) {
      properties.options = [];
    }

    let polarField: any = null;
    if (this.polarService.isGatewayConfigured()) {
      const payload: any = {
        name: dto.name,
        slug: sanitizedSlug,
        type: dto.type,
        properties,
        metadata: dto.metadata || undefined,
      };

      const orgId = await this.polarService.getOrganizationIdForPayload();
      if (orgId) {
        payload.organizationId = orgId;
      }

      try {
        polarField = await this.polarService.createCustomField(payload);
      } catch (err: any) {
        this.logger.error(
          `Polar custom field creation failed: ${err?.message}`,
          err?.stack,
        );
        const detail =
          err?.detail ||
          err?.body$ ||
          err?.message ||
          'Polar custom field creation failed';
        throw new BadRequestException(
          typeof detail === 'string' ? detail : JSON.stringify(detail),
        );
      }
    }

    const cfEntity = this.customFieldRepo.create({
      polarCustomFieldId: polarField?.id || `local_cf_${Date.now()}`,
      slug: sanitizedSlug,
      name: dto.name,
      type: dto.type as PolarCustomFieldType,
      properties: properties,
      metadata:
        dto.metadata ||
        (dto.required !== undefined ? { required: dto.required } : {}),
    });

    const saved = await this.customFieldRepo.save(cfEntity);
    return plainToInstance(PolarCustomFieldResDto, saved);
  }

  async updateCustomField(
    id: AutoIncrementID,
    dto: UpdateCustomFieldReqDto,
  ): Promise<PolarCustomFieldResDto> {
    const cf = await this.customFieldRepo.findOne({ where: { id } });
    if (!cf) {
      throw new NotFoundException(`Custom field with ID #${id} not found.`);
    }

    if (
      this.polarService.isGatewayConfigured() &&
      cf.polarCustomFieldId &&
      !cf.polarCustomFieldId.startsWith('local_')
    ) {
      const payload: any = {};
      if (dto.name !== undefined) payload.name = dto.name;
      if (dto.slug !== undefined) payload.slug = dto.slug;
      if (dto.properties !== undefined) payload.properties = dto.properties;
      if (dto.metadata !== undefined) payload.metadata = dto.metadata;

      await this.polarService.updateCustomField(cf.polarCustomFieldId, payload);
    }

    if (dto.name !== undefined) cf.name = dto.name;
    if (dto.slug !== undefined) cf.slug = dto.slug;
    if (dto.properties !== undefined) cf.properties = dto.properties;
    if (dto.metadata !== undefined) cf.metadata = dto.metadata;

    const saved = await this.customFieldRepo.save(cf);
    return plainToInstance(PolarCustomFieldResDto, saved);
  }

  async deleteCustomField(id: AutoIncrementID): Promise<void> {
    const cf = await this.customFieldRepo.findOne({ where: { id } });
    if (!cf) {
      throw new NotFoundException(`Custom field with ID #${id} not found.`);
    }

    if (
      this.polarService.isGatewayConfigured() &&
      cf.polarCustomFieldId &&
      !cf.polarCustomFieldId.startsWith('local_')
    ) {
      try {
        await this.polarService.deleteCustomField(cf.polarCustomFieldId);
      } catch (err: any) {
        this.logger.warn(
          `Failed to delete custom field ${cf.polarCustomFieldId} on Polar: ${err.message}`,
        );
      }
    }

    await this.customFieldRepo.remove(cf);
  }

  async syncCustomFieldFromPolar(data: any): Promise<PolarCustomFieldEntity> {
    const polarCustomFieldId = data.id;
    if (!polarCustomFieldId) {
      throw new Error('Missing custom field ID from Polar data');
    }

    let local = await this.customFieldRepo.findOne({
      where: { polarCustomFieldId },
    });

    const slug = data.slug;
    const name = data.name;
    const type = data.type as PolarCustomFieldType;
    const properties = data.properties ?? {};
    const metadata = data.metadata ?? {};

    if (!local) {
      local = this.customFieldRepo.create({
        polarCustomFieldId,
        slug,
        name,
        type,
        properties,
        metadata,
      });
    } else {
      local.slug = slug;
      local.name = name;
      local.type = type;
      local.properties = properties;
      local.metadata = metadata;
    }

    return await this.customFieldRepo.save(local);
  }

  async deleteCustomFieldByPolarId(polarCustomFieldId: string): Promise<void> {
    if (!polarCustomFieldId) return;
    const cf = await this.customFieldRepo.findOne({
      where: { polarCustomFieldId },
    });
    if (cf) {
      this.logger.log(
        `Removing local custom field #${cf.id} ("${cf.name}") for deleted Polar ID: ${polarCustomFieldId}`,
      );
      await this.customFieldRepo.remove(cf);
    }
  }

  async syncCustomFields(): Promise<{ synced: number }> {
    if (!this.polarService.isGatewayConfigured()) {
      return { synced: 0 };
    }

    this.logger.log('Syncing custom fields from Polar...');
    const result = await this.polarService.listCustomFields({ limit: 100 });
    const items =
      (result as any)?.items ?? (result as any)?.result?.items ?? [];

    const polarIds = new Set<string>();
    let count = 0;

    for (const item of items) {
      if (item.id) {
        polarIds.add(item.id);
      }
      await this.syncCustomFieldFromPolar(item);
      count++;
    }

    // Prune local custom fields that were removed from Polar
    const allLocals = await this.customFieldRepo.find();
    for (const local of allLocals) {
      if (
        local.polarCustomFieldId &&
        !local.polarCustomFieldId.startsWith('local_') &&
        !polarIds.has(local.polarCustomFieldId)
      ) {
        this.logger.log(
          `Pruning deleted Polar custom field #${local.id} ("${local.name}", Polar ID: ${local.polarCustomFieldId})`,
        );
        await this.customFieldRepo.remove(local);
      }
    }

    this.logger.log(`Synced ${count} custom fields from Polar.`);
    return { synced: count };
  }
}
