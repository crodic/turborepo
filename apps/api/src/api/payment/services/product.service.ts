import { AutoIncrementID } from '@/common/types/common.type';
import {
  ConflictException,
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
import { CreateProductReqDto } from '../dto/create-product.req.dto';
import { PaymentProductResDto } from '../dto/payment-product.res.dto';
import { UpdateProductReqDto } from '../dto/update-product.req.dto';
import { PaymentProductEntity } from '../entities/payment-product.entity';
import { PolarService } from './polar.service';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(PaymentProductEntity)
    private readonly productRepo: Repository<PaymentProductEntity>,
    private readonly polarService: PolarService,
  ) {}

  /**
   * Retrieves all active pricing products for public client display
   */
  async getActiveProducts(): Promise<PaymentProductResDto[]> {
    const products = await this.productRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return plainToInstance(PaymentProductResDto, products);
  }

  /**
   * Finds an active product by plan slug and interval, or throws NotFoundException
   */
  async getProductBySlugAndInterval(
    planSlug: string,
    interval: string,
  ): Promise<PaymentProductEntity> {
    const product = await this.productRepo.findOne({
      where: { planSlug, interval, isActive: true },
    });

    if (!product) {
      throw new NotFoundException(
        `Pricing plan "${planSlug}" with interval "${interval}" was not found or is currently inactive.`,
      );
    }

    return product;
  }

  /**
   * Retrieves paginated list of all products for admin management
   */
  async getAdminProducts(
    query: PaginateQuery,
  ): Promise<Paginated<PaymentProductResDto>> {
    const queryBuilder = this.productRepo.createQueryBuilder('product');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: [
        'id',
        'planSlug',
        'name',
        'interval',
        'price',
        'sortOrder',
        'isActive',
        'createdAt',
      ],
      searchableColumns: ['planSlug', 'name', 'polarProductId'],
      defaultSortBy: [
        ['sortOrder', 'ASC'],
        ['id', 'ASC'],
      ],
      filterableColumns: {
        planSlug: [FilterOperator.EQ, FilterOperator.IN, FilterOperator.ILIKE],
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
        interval: [FilterOperator.EQ, FilterOperator.IN],
        isActive: [FilterOperator.EQ],
      },
    });

    return {
      ...result,
      data: plainToInstance(PaymentProductResDto, result.data),
    } as Paginated<PaymentProductResDto>;
  }

  /**
   * Retrieves a single product by ID for admin view/edit
   */
  async getAdminProductById(
    id: AutoIncrementID,
  ): Promise<PaymentProductResDto> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID #${id} not found.`);
    }
    return plainToInstance(PaymentProductResDto, product);
  }

  /**
   * Creates a new pricing product in the database
   */
  async createProduct(dto: CreateProductReqDto): Promise<PaymentProductResDto> {
    const existing = await this.productRepo.findOne({
      where: { planSlug: dto.planSlug, interval: dto.interval },
    });

    if (existing) {
      throw new ConflictException(
        `A product with planSlug "${dto.planSlug}" and interval "${dto.interval}" already exists.`,
      );
    }

    const product = this.productRepo.create({
      ...dto,
      currency: dto.currency || 'usd',
      prices:
        dto.prices && dto.prices.length > 0
          ? dto.prices
          : [{ amount: dto.price, currency: dto.currency || 'usd' }],
      polarProductId: dto.polarProductId || '',
      features: dto.features || [],
      metadata: {},
      benefits: [],
      medias: [],
      ctaText: dto.ctaText || 'Get Started',
      isPopular: dto.isPopular ?? false,
      isFree: dto.isFree ?? dto.price === 0,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });

    const saved = await this.productRepo.save(product);
    this.logger.log(
      `Product created: ${saved.planSlug} (${saved.interval}) - Polar ID: ${saved.polarProductId}`,
    );

    return plainToInstance(PaymentProductResDto, saved);
  }

  /**
   * Updates an existing pricing product
   */
  async updateProduct(
    id: AutoIncrementID,
    dto: UpdateProductReqDto,
  ): Promise<PaymentProductResDto> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID #${id} not found.`);
    }

    // Check conflict if changing planSlug or interval
    const targetSlug = dto.planSlug || product.planSlug;
    const targetInterval = dto.interval || product.interval;

    if (
      targetSlug !== product.planSlug ||
      targetInterval !== product.interval
    ) {
      const existing = await this.productRepo.findOne({
        where: { planSlug: targetSlug, interval: targetInterval },
      });
      if (existing && existing.id !== product.id) {
        throw new ConflictException(
          `Another product already has planSlug "${targetSlug}" and interval "${targetInterval}".`,
        );
      }
    }

    Object.assign(product, dto);
    if (dto.price !== undefined && !dto.prices) {
      product.prices = [
        {
          amount: dto.price,
          currency: dto.currency || product.currency || 'usd',
        },
      ];
    }
    const updated = await this.productRepo.save(product);
    this.logger.log(
      `Product #${id} updated: ${updated.planSlug} (${updated.interval}) - Polar ID: ${updated.polarProductId}`,
    );

    return plainToInstance(PaymentProductResDto, updated);
  }

  /**
   * Deletes a pricing product
   */
  async deleteProduct(id: AutoIncrementID): Promise<void> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID #${id} not found.`);
    }

    await this.productRepo.remove(product);
    this.logger.log(
      `Product #${id} (${product.planSlug} ${product.interval}) deleted.`,
    );
  }

  /**
   * Synchronizes product definition from Polar webhook (product.created / product.updated)
   */
  async syncProductFromPolar(
    polarProduct: Record<string, any>,
  ): Promise<PaymentProductEntity> {
    const polarProductId = polarProduct.id;
    if (!polarProductId) {
      throw new Error('Missing product ID in Polar webhook data');
    }

    const name = polarProduct.name || 'Untitled Plan';
    const description = polarProduct.description ?? null;
    const recurringInterval =
      polarProduct.recurring_interval || polarProduct.recurringInterval;

    let interval = 'one_time';
    if (recurringInterval === 'month') {
      interval = 'monthly';
    } else if (recurringInterval === 'year') {
      interval = 'yearly';
    }

    // Extract price and currency
    const rawPrices = polarProduct.prices || [];
    const parsedPrices: Array<{
      id?: string;
      amount: number;
      currency: string;
      isArchived?: boolean;
    }> = [];

    for (const p of rawPrices) {
      const pId = p.id;
      const rawAmount = p.price_amount ?? p.priceAmount ?? 0;
      const pCurrency = (
        p.price_currency ??
        p.priceCurrency ??
        'usd'
      ).toLowerCase();
      const isZeroDecimal = pCurrency === 'vnd' || pCurrency === 'jpy';
      const amount = isZeroDecimal ? rawAmount : Math.round(rawAmount / 100);
      const isPriceArchived = Boolean(p.is_archived ?? p.isArchived);

      parsedPrices.push({
        id: pId,
        amount,
        currency: pCurrency,
        isArchived: isPriceArchived,
      });
    }

    const activePrices = parsedPrices.filter((p) => !p.isArchived);
    // Prefer the first non-zero (paid) price as the primary fallback, else first active price
    const paidPrice = activePrices.find((p) => p.amount > 0);
    const primaryPrice = paidPrice ||
      activePrices[0] || { amount: 0, currency: 'usd' };

    const price = primaryPrice.amount;
    const currency = primaryPrice.currency;
    const isFree =
      activePrices.length === 0 || !activePrices.some((p) => p.amount > 0);

    const isArchived = Boolean(
      polarProduct.is_archived ?? polarProduct.isArchived,
    );

    const rawMetadata = polarProduct.metadata || {};
    const benefits = polarProduct.benefits || [];
    const medias = polarProduct.medias || [];
    const trialInterval =
      polarProduct.trial_interval ?? polarProduct.trialInterval ?? null;
    const trialIntervalCount =
      polarProduct.trial_interval_count ??
      polarProduct.trialIntervalCount ??
      null;

    // Optional overrides configured in Polar metadata
    const metaBadge = rawMetadata.badge ?? rawMetadata.tag ?? undefined;
    const metaCtaText =
      rawMetadata.ctaText ?? rawMetadata.cta_text ?? undefined;
    const metaIsPopular =
      rawMetadata.isPopular !== undefined
        ? rawMetadata.isPopular === true || rawMetadata.isPopular === 'true'
        : undefined;
    const metaSortOrder =
      rawMetadata.sortOrder !== undefined
        ? Number(rawMetadata.sortOrder)
        : rawMetadata.sort_order !== undefined
          ? Number(rawMetadata.sort_order)
          : undefined;

    // Extract features from benefits if provided
    const features: string[] = benefits
      .map((b: any) => b.description || b.name || '')
      .filter((text: string) => text.trim().length > 0);

    // Calculate candidate slug from Polar metadata or product name
    const candidateSlug =
      rawMetadata.planSlug ||
      rawMetadata.slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') ||
      `plan-${polarProductId.slice(0, 8)}`;

    // 1. Check if product already exists by polarProductId
    const product = await this.productRepo.findOne({
      where: { polarProductId },
    });

    if (product) {
      // Update planSlug if user updated it on Polar and there is no unique constraint conflict
      if (candidateSlug && candidateSlug !== product.planSlug) {
        const conflict = await this.productRepo.findOne({
          where: { planSlug: candidateSlug, interval },
        });
        if (!conflict || conflict.id === product.id) {
          product.planSlug = candidateSlug;
        } else {
          this.logger.warn(
            `Skipping planSlug update for product #${product.id} to "${candidateSlug}" due to conflict with existing product #${conflict.id}`,
          );
        }
      }

      // Update existing product
      product.name = name;
      if (description !== null && description !== undefined) {
        product.description = description;
      }
      product.price = price;
      product.currency = currency;
      product.prices = parsedPrices;
      product.interval = interval;
      product.isFree = isFree;
      product.isActive = !isArchived;
      product.metadata = rawMetadata;
      product.benefits = benefits;
      product.medias = medias;
      product.trialInterval = trialInterval;
      product.trialIntervalCount = trialIntervalCount;

      if (metaBadge !== undefined) product.badge = metaBadge;
      if (metaCtaText !== undefined) product.ctaText = metaCtaText;
      if (metaIsPopular !== undefined) product.isPopular = metaIsPopular;
      if (metaSortOrder !== undefined && !Number.isNaN(metaSortOrder)) {
        product.sortOrder = metaSortOrder;
      }

      if (features.length > 0) {
        product.features = features;
      }

      const updated = await this.productRepo.save(product);
      this.logger.log(
        `Synchronized product #${updated.id} from Polar: "${updated.name}" (${updated.planSlug} - ${updated.interval}) - Primary Price: ${updated.price} ${updated.currency.toUpperCase()}`,
      );
      return updated;
    }

    // 2. Generate slug for new product
    let planSlug = candidateSlug;

    // Ensure (planSlug, interval) uniqueness
    const existingWithSlug = await this.productRepo.findOne({
      where: { planSlug, interval },
    });

    if (existingWithSlug) {
      if (!existingWithSlug.polarProductId) {
        // Link unlinked product
        existingWithSlug.polarProductId = polarProductId;
        existingWithSlug.name = name;
        if (description) existingWithSlug.description = description;
        existingWithSlug.price = price;
        existingWithSlug.currency = currency;
        existingWithSlug.prices = parsedPrices;
        existingWithSlug.isFree = isFree;
        existingWithSlug.isActive = !isArchived;
        existingWithSlug.metadata = rawMetadata;
        existingWithSlug.benefits = benefits;
        existingWithSlug.medias = medias;
        existingWithSlug.trialInterval = trialInterval;
        existingWithSlug.trialIntervalCount = trialIntervalCount;
        if (metaBadge !== undefined) existingWithSlug.badge = metaBadge;
        if (metaCtaText !== undefined) existingWithSlug.ctaText = metaCtaText;
        if (metaIsPopular !== undefined)
          existingWithSlug.isPopular = metaIsPopular;
        if (metaSortOrder !== undefined && !Number.isNaN(metaSortOrder)) {
          existingWithSlug.sortOrder = metaSortOrder;
        }

        const linked = await this.productRepo.save(existingWithSlug);
        this.logger.log(
          `Linked and synchronized existing product #${linked.id} with Polar ID ${polarProductId}`,
        );
        return linked;
      } else {
        // Disambiguate slug
        planSlug = `${planSlug}-${polarProductId.slice(0, 4)}`;
      }
    }

    // 3. Create new product record
    const newProduct = this.productRepo.create({
      polarProductId,
      planSlug,
      name,
      description,
      interval,
      price,
      currency,
      prices: parsedPrices,
      metadata: rawMetadata,
      benefits,
      medias,
      trialInterval,
      trialIntervalCount,
      features,
      badge: metaBadge ?? null,
      ctaText: metaCtaText ?? 'Get Started',
      isPopular: metaIsPopular ?? false,
      isFree,
      isActive: !isArchived,
      sortOrder:
        metaSortOrder && !Number.isNaN(metaSortOrder) ? metaSortOrder : 0,
    });

    const saved = await this.productRepo.save(newProduct);
    this.logger.log(
      `Created new product #${saved.id} from Polar webhook: "${saved.name}" (${saved.interval}) - Price: ${saved.price} ${saved.currency.toUpperCase()}`,
    );
    return saved;
  }

  /**
   * Fetches all products from Polar API and synchronizes them into local database
   */
  async syncAllProductsFromPolar(): Promise<{
    syncedCount: number;
    products: PaymentProductResDto[];
  }> {
    this.logger.log('Initiating on-demand sync from Polar product catalog...');
    const response = await this.polarService.listProducts();
    const items =
      (response as any)?.result?.items ??
      (response as any)?.items ??
      (Array.isArray(response) ? response : []);

    const syncedEntities: PaymentProductEntity[] = [];
    for (const item of items) {
      try {
        const entity = await this.syncProductFromPolar(item);
        syncedEntities.push(entity);
      } catch (err: any) {
        this.logger.error(
          `Failed to sync product "${item.id}" from Polar: ${err.message}`,
          err.stack,
        );
      }
    }

    this.logger.log(
      `Synchronized ${syncedEntities.length} products successfully from Polar.`,
    );

    return {
      syncedCount: syncedEntities.length,
      products: plainToInstance(PaymentProductResDto, syncedEntities),
    };
  }
}
