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
import { CreateDiscountReqDto } from '../dto/create-discount.req.dto';
import { PolarDiscountResDto } from '../dto/polar-discount.res.dto';
import { UpdateDiscountReqDto } from '../dto/update-discount.req.dto';
import {
  PolarDiscountDuration,
  PolarDiscountEntity,
  PolarDiscountType,
} from '../entities/polar-discount.entity';
import { PolarService } from './polar.service';

@Injectable()
export class DiscountService {
  private readonly logger = new Logger(DiscountService.name);

  constructor(
    @InjectRepository(PolarDiscountEntity)
    private readonly discountRepo: Repository<PolarDiscountEntity>,
    private readonly polarService: PolarService,
  ) {}

  async getAdminDiscounts(
    query: PaginateQuery,
  ): Promise<Paginated<PolarDiscountResDto>> {
    const queryBuilder = this.discountRepo.createQueryBuilder('discount');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: [
        'id',
        'name',
        'type',
        'code',
        'duration',
        'redemptionsCount',
        'createdAt',
      ],
      searchableColumns: ['name', 'code', 'polarDiscountId'],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        type: [FilterOperator.EQ],
        duration: [FilterOperator.EQ],
        code: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });

    return {
      ...result,
      data: plainToInstance(PolarDiscountResDto, result.data),
    } as Paginated<PolarDiscountResDto>;
  }

  async getDiscountById(id: AutoIncrementID): Promise<PolarDiscountResDto> {
    const discount = await this.discountRepo.findOne({ where: { id } });
    if (!discount) {
      throw new NotFoundException(`Discount with ID #${id} not found.`);
    }
    return plainToInstance(PolarDiscountResDto, discount);
  }

  async createDiscount(
    dto: CreateDiscountReqDto,
  ): Promise<PolarDiscountResDto> {
    this.logger.log(`Creating discount "${dto.name}"...`);

    let polarDiscount: any = null;
    if (this.polarService.isGatewayConfigured()) {
      const payload: any = {
        name: dto.name,
        type: dto.type,
        duration: dto.duration,
        code: dto.code || undefined,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        maxRedemptions: dto.maxRedemptions || undefined,
        products: dto.productIds || undefined,
        metadata: dto.metadata || undefined,
      };

      if (dto.type === 'percentage') {
        payload.basisPoints = dto.basisPoints;
      } else {
        payload.amounts = {
          [(dto.currency || 'usd').toLowerCase()]: dto.amount || 0,
        };
      }

      if (dto.duration === 'repeating') {
        payload.durationInMonths = dto.durationInMonths;
      }

      const orgId = await this.polarService.getOrganizationIdForPayload();
      if (orgId) {
        payload.organizationId = orgId;
      }

      try {
        polarDiscount = await this.polarService.createDiscount(payload);
      } catch (err: any) {
        this.logger.error(
          `Polar discount creation failed: ${err?.message}`,
          err?.stack,
        );
        const detail =
          err?.detail ||
          err?.body$ ||
          err?.message ||
          'Polar discount creation failed';
        throw new BadRequestException(
          typeof detail === 'string' ? detail : JSON.stringify(detail),
        );
      }
    }

    const discountEntity = this.discountRepo.create({
      polarDiscountId: polarDiscount?.id || `local_disc_${Date.now()}`,
      name: dto.name,
      type: dto.type as PolarDiscountType,
      amount: dto.amount,
      basisPoints: dto.basisPoints,
      currency: dto.currency || 'usd',
      amounts: dto.amount ? { [dto.currency || 'usd']: dto.amount } : null,
      code: dto.code,
      duration: dto.duration as PolarDiscountDuration,
      durationInMonths: dto.durationInMonths,
      maxRedemptions: dto.maxRedemptions,
      redemptionsCount: 0,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      productIds: dto.productIds || [],
      metadata: dto.metadata || {},
    });

    const saved = await this.discountRepo.save(discountEntity);
    return plainToInstance(PolarDiscountResDto, saved);
  }

  async updateDiscount(
    id: AutoIncrementID,
    dto: UpdateDiscountReqDto,
  ): Promise<PolarDiscountResDto> {
    const discount = await this.discountRepo.findOne({ where: { id } });
    if (!discount) {
      throw new NotFoundException(`Discount with ID #${id} not found.`);
    }

    if (
      this.polarService.isGatewayConfigured() &&
      discount.polarDiscountId &&
      !discount.polarDiscountId.startsWith('local_')
    ) {
      const payload: any = {};
      if (dto.name !== undefined) payload.name = dto.name;
      if (dto.code !== undefined) payload.code = dto.code;
      if (dto.startsAt !== undefined)
        payload.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
      if (dto.endsAt !== undefined)
        payload.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
      if (dto.maxRedemptions !== undefined)
        payload.maxRedemptions = dto.maxRedemptions;
      if (dto.productIds !== undefined) payload.products = dto.productIds;
      if (dto.metadata !== undefined) payload.metadata = dto.metadata;

      await this.polarService.updateDiscount(discount.polarDiscountId, payload);
    }

    if (dto.name !== undefined) discount.name = dto.name;
    if (dto.code !== undefined) discount.code = dto.code;
    if (dto.startsAt !== undefined)
      discount.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined)
      discount.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (dto.maxRedemptions !== undefined)
      discount.maxRedemptions = dto.maxRedemptions;
    if (dto.productIds !== undefined) discount.productIds = dto.productIds;
    if (dto.metadata !== undefined) discount.metadata = dto.metadata;

    const saved = await this.discountRepo.save(discount);
    return plainToInstance(PolarDiscountResDto, saved);
  }

  async deleteDiscount(id: AutoIncrementID): Promise<void> {
    const discount = await this.discountRepo.findOne({ where: { id } });
    if (!discount) {
      throw new NotFoundException(`Discount with ID #${id} not found.`);
    }

    if (
      this.polarService.isGatewayConfigured() &&
      discount.polarDiscountId &&
      !discount.polarDiscountId.startsWith('local_')
    ) {
      try {
        await this.polarService.deleteDiscount(discount.polarDiscountId);
      } catch (err: any) {
        this.logger.warn(
          `Failed to delete discount ${discount.polarDiscountId} on Polar: ${err.message}`,
        );
      }
    }

    await this.discountRepo.remove(discount);
  }

  async syncDiscountFromPolar(data: any): Promise<PolarDiscountEntity> {
    const polarDiscountId = data.id;
    if (!polarDiscountId) {
      throw new Error('Missing discount ID from Polar data');
    }

    let local = await this.discountRepo.findOne({
      where: { polarDiscountId },
    });

    const name = data.name || 'Unnamed Discount';
    const type = (data.type || 'percentage') as PolarDiscountType;
    const duration = (data.duration || 'once') as PolarDiscountDuration;
    const durationInMonths =
      data.duration_in_months ?? data.durationInMonths ?? null;
    const code = data.code ?? null;
    const basisPoints = data.basis_points ?? data.basisPoints ?? null;
    const amount = data.amount ?? null;
    const amounts =
      data.amounts ?? (amount ? { [data.currency || 'usd']: amount } : null);
    const currency =
      data.currency || (amounts ? Object.keys(amounts)[0] : 'usd');
    const maxRedemptions = data.max_redemptions ?? data.maxRedemptions ?? null;
    const redemptionsCount =
      data.redemptions_count ?? data.redemptionsCount ?? 0;
    const startsAt =
      data.starts_at || data.startsAt
        ? new Date(data.starts_at || data.startsAt)
        : null;
    const endsAt =
      data.ends_at || data.endsAt
        ? new Date(data.ends_at || data.endsAt)
        : null;
    const rawProducts =
      data.products || data.product_ids || data.productIds || [];
    const productIds = rawProducts
      .map((p: any) => p?.id || p)
      .filter((id: any) => typeof id === 'string');
    const metadata = data.metadata ?? {};

    if (!local) {
      local = this.discountRepo.create({
        polarDiscountId,
        name,
        type,
        amount,
        basisPoints,
        currency,
        amounts,
        code,
        duration,
        durationInMonths,
        maxRedemptions,
        redemptionsCount,
        startsAt,
        endsAt,
        productIds,
        metadata,
      });
    } else {
      local.name = name;
      local.type = type;
      local.amount = amount;
      local.basisPoints = basisPoints;
      local.currency = currency;
      local.amounts = amounts;
      local.code = code;
      local.duration = duration;
      local.durationInMonths = durationInMonths;
      local.maxRedemptions = maxRedemptions;
      local.redemptionsCount = redemptionsCount;
      local.startsAt = startsAt;
      local.endsAt = endsAt;
      local.productIds = productIds;
      local.metadata = metadata;
    }

    return await this.discountRepo.save(local);
  }

  async deleteDiscountByPolarId(polarDiscountId: string): Promise<void> {
    if (!polarDiscountId) return;
    const discount = await this.discountRepo.findOne({
      where: { polarDiscountId },
    });
    if (discount) {
      this.logger.log(
        `Removing local discount #${discount.id} ("${discount.name}") for deleted Polar ID: ${polarDiscountId}`,
      );
      await this.discountRepo.remove(discount);
    }
  }

  async syncDiscounts(): Promise<{ synced: number }> {
    if (!this.polarService.isGatewayConfigured()) {
      return { synced: 0 };
    }

    this.logger.log('Syncing discounts from Polar...');
    const result = await this.polarService.listDiscounts({ limit: 100 });
    const items =
      (result as any)?.items ?? (result as any)?.result?.items ?? [];

    const polarIds = new Set<string>();
    let count = 0;

    for (const item of items) {
      if (item.id) {
        polarIds.add(item.id);
      }
      await this.syncDiscountFromPolar(item);
      count++;
    }

    // Prune local discounts that were removed from Polar
    const allLocals = await this.discountRepo.find();
    for (const local of allLocals) {
      if (
        local.polarDiscountId &&
        !local.polarDiscountId.startsWith('local_') &&
        !polarIds.has(local.polarDiscountId)
      ) {
        this.logger.log(
          `Pruning deleted Polar discount #${local.id} ("${local.name}", Polar ID: ${local.polarDiscountId})`,
        );
        await this.discountRepo.remove(local);
      }
    }

    this.logger.log(`Synced ${count} discounts from Polar.`);
    return { synced: count };
  }
}
