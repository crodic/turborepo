import { AllConfigType } from '@/config/config.type';
import { RedisService } from '@/redis/redis.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Polar } from '@polar-sh/sdk';
import * as crypto from 'crypto';
import { Webhook, WebhookVerificationError } from 'standardwebhooks';
import { CreateCheckoutLinkReqDto } from '../dto/create-checkout-link.req.dto';
import { CreateDiscountReqDto } from '../dto/create-discount.req.dto';
import { CreateProductReqDto } from '../dto/create-product.req.dto';
import { UpdateCheckoutLinkReqDto } from '../dto/update-checkout-link.req.dto';
import { UpdateDiscountReqDto } from '../dto/update-discount.req.dto';
import { UpdateProductReqDto } from '../dto/update-product.req.dto';

export interface CreateCheckoutSessionParams {
  productId: string;
  successUrl: string;
  customerEmail?: string;
  customerName?: string;
  externalCustomerId?: string;
  metadata?: Record<string, any>;
}

export interface CreateCustomerSessionParams {
  customerId?: string;
  externalCustomerId?: string;
}

@Injectable()
export class PolarService {
  private readonly logger = new Logger(PolarService.name);
  private client: Polar | null = null;
  private readonly webhookSecret?: string;
  private readonly isConfigured: boolean;
  private readonly DEFAULT_CACHE_TTL = 600; // 10 minutes in seconds

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly redisService: RedisService,
  ) {
    const paymentConfig = this.configService.get('payment', { infer: true });
    const accessToken = paymentConfig?.accessToken;
    this.webhookSecret = paymentConfig?.webhookSecret;
    const server = paymentConfig?.server || 'sandbox';

    if (accessToken) {
      this.client = new Polar({
        accessToken,
        server,
      });
      this.isConfigured = true;
      this.logger.log(`Polar SDK initialized in [${server}] mode.`);
    } else {
      this.isConfigured = false;
      this.logger.warn(
        'POLAR_ACCESS_TOKEN is not configured. Polar gateway is disabled.',
      );
    }
  }

  private ensureConfigured(): Polar {
    if (!this.client || !this.isConfigured) {
      throw new ServiceUnavailableException(
        'Polar Payment Gateway is not configured. Please set POLAR_ACCESS_TOKEN.',
      );
    }
    return this.client;
  }

  /**
   * Helper to retrieve from Redis cache or fetch fresh and cache
   */
  private async getOrSetCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    useCache = true,
    forceRefresh = false,
    ttl = this.DEFAULT_CACHE_TTL,
  ): Promise<T> {
    if (!useCache) {
      return await fetcher();
    }

    if (!forceRefresh) {
      try {
        const cached = await this.redisService.get(key);
        if (cached) {
          return JSON.parse(cached) as T;
        }
      } catch (err: any) {
        this.logger.warn(`Redis get failed for key '${key}': ${err.message}`);
      }
    }

    const fresh = await fetcher();

    try {
      await this.redisService.set(key, JSON.stringify(fresh), ttl);
    } catch (err: any) {
      this.logger.warn(`Redis set failed for key '${key}': ${err.message}`);
    }

    return fresh;
  }

  /**
   * Clears polar redis cache by scope or all
   */
  async clearCache(scope?: string): Promise<void> {
    const redis = this.redisService.getClient();
    let pattern = 'polar:cache:*';
    if (scope === 'products') pattern = 'polar:cache:product*';
    else if (scope === 'discounts') pattern = 'polar:cache:discount*';
    else if (scope === 'checkout-links') pattern = 'polar:cache:checkout_link*';

    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await this.redisService.del(...keys);
        this.logger.log(
          `Cleared ${keys.length} Polar cache keys matching '${pattern}'`,
        );
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to clear Polar cache for pattern '${pattern}': ${err.message}`,
      );
    }
  }

  /**
   * Fetches active products and tiers directly from Polar with pagination
   */
  async listProducts(
    params?: {
      query?: string;
      isRecurring?: boolean;
      page?: number;
      limit?: number;
    },
    useCache = true,
    forceRefresh = false,
  ) {
    const page = params?.page ? Number(params.page) : 1;
    const limit = params?.limit ? Number(params.limit) : 10;
    const query = params?.query || '';
    const isRecurring = params?.isRecurring;
    const cacheKey = `polar:cache:products:list:q=${query}:rec=${isRecurring}:p=${page}:l=${limit}`;

    return await this.getOrSetCache(
      cacheKey,
      async () => {
        const polar = this.ensureConfigured();
        const response = await polar.products.list({
          isArchived: false,
          ...(params?.query ? { query: params.query } : {}),
          ...(params?.isRecurring !== undefined
            ? { isRecurring: params.isRecurring }
            : {}),
          page,
          limit,
        });
        return {
          data: response.result?.items ?? [],
          meta: {
            totalItems: response.result?.pagination?.totalCount ?? 0,
            totalPages: response.result?.pagination?.maxPage ?? 1,
            currentPage: page,
            itemsPerPage: limit,
          },
        };
      },
      useCache,
      forceRefresh,
    );
  }

  /**
   * Fetches product details directly from Polar
   */
  async getProduct(id: string, useCache = true, forceRefresh = false) {
    const cacheKey = `polar:cache:product:${id}`;
    return await this.getOrSetCache(
      cacheKey,
      async () => {
        const polar = this.ensureConfigured();
        try {
          return await polar.products.get({ id });
        } catch (err: any) {
          if (
            err.statusCode === 404 ||
            err.status === 404 ||
            err.name === 'ResourceNotFound'
          ) {
            throw new NotFoundException(
              `Product '${id}' was not found on Polar.`,
            );
          }
          if (
            err.statusCode === 422 ||
            err.status === 422 ||
            err.name === 'HTTPValidationError'
          ) {
            throw new BadRequestException(`Invalid product ID format: ${id}`);
          }
          throw err;
        }
      },
      useCache,
      forceRefresh,
    );
  }

  /**
   * Fetches automated benefits from Polar
   */
  async listBenefits(
    params?: {
      type?: string;
      page?: number;
      limit?: number;
    },
    useCache = true,
    forceRefresh = false,
  ) {
    const page = params?.page ? Number(params.page) : 1;
    const limit = params?.limit ? Number(params.limit) : 50;
    const cacheKey = `polar:cache:benefits:list:p=${page}:l=${limit}`;

    return await this.getOrSetCache(
      cacheKey,
      async () => {
        const polar = this.ensureConfigured();
        const organizationId = await this.getOrganizationId();
        const response = await polar.benefits.list({
          organizationId: organizationId || undefined,
          page,
          limit,
        });

        const items: any[] = [];
        let totalCount = 0;
        let totalPages = 1;

        for await (const pageResult of response) {
          if (pageResult.result?.items) {
            items.push(...pageResult.result.items);
            totalCount = pageResult.result.pagination.totalCount;
            totalPages = pageResult.result.pagination.maxPage;
          }
        }

        return {
          data: items,
          meta: {
            page,
            limit,
            total: totalCount || items.length,
            totalPages,
          },
        };
      },
      useCache,
      forceRefresh,
    );
  }

  /**
   * Fetches discounts directly from Polar with pagination
   */
  async listDiscounts(
    params?: {
      query?: string;
      page?: number;
      limit?: number;
    },
    useCache = true,
    forceRefresh = false,
  ) {
    const page = params?.page ? Number(params.page) : 1;
    const limit = params?.limit ? Number(params.limit) : 10;
    const query = params?.query || '';
    const cacheKey = `polar:cache:discounts:list:q=${query}:p=${page}:l=${limit}`;

    return await this.getOrSetCache(
      cacheKey,
      async () => {
        const polar = this.ensureConfigured();
        const response = await polar.discounts.list({
          ...(params?.query ? { query: params.query } : {}),
          page,
          limit,
        });
        return {
          data: response.result?.items ?? [],
          meta: {
            totalItems: response.result?.pagination?.totalCount ?? 0,
            totalPages: response.result?.pagination?.maxPage ?? 1,
            currentPage: page,
            itemsPerPage: limit,
          },
        };
      },
      useCache,
      forceRefresh,
    );
  }

  /**
   * Fetches discount details directly from Polar
   */
  async getDiscount(id: string, useCache = true, forceRefresh = false) {
    const cacheKey = `polar:cache:discount:${id}`;
    return await this.getOrSetCache(
      cacheKey,
      async () => {
        const polar = this.ensureConfigured();
        try {
          return await polar.discounts.get({ id });
        } catch (err: any) {
          if (
            err.statusCode === 404 ||
            err.status === 404 ||
            err.name === 'ResourceNotFound'
          ) {
            throw new NotFoundException(
              `Discount '${id}' was not found on Polar.`,
            );
          }
          if (
            err.statusCode === 422 ||
            err.status === 422 ||
            err.name === 'HTTPValidationError'
          ) {
            throw new BadRequestException(`Invalid discount ID format: ${id}`);
          }
          throw err;
        }
      },
      useCache,
      forceRefresh,
    );
  }

  /**
   * Fetches checkout links directly from Polar with pagination
   */
  async listCheckoutLinks(
    params?: {
      productId?: string;
      page?: number;
      limit?: number;
    },
    useCache = true,
    forceRefresh = false,
  ) {
    const page = params?.page ? Number(params.page) : 1;
    const limit = params?.limit ? Number(params.limit) : 10;
    const productId = params?.productId || '';
    const cacheKey = `polar:cache:checkout_links:list:prod=${productId}:p=${page}:l=${limit}`;

    return await this.getOrSetCache(
      cacheKey,
      async () => {
        const polar = this.ensureConfigured();
        const response = await polar.checkoutLinks.list({
          ...(params?.productId ? { productId: params.productId } : {}),
          page,
          limit,
        });
        return {
          data: response.result?.items ?? [],
          meta: {
            totalItems: response.result?.pagination?.totalCount ?? 0,
            totalPages: response.result?.pagination?.maxPage ?? 1,
            currentPage: page,
            itemsPerPage: limit,
          },
        };
      },
      useCache,
      forceRefresh,
    );
  }

  /**
   * Fetches checkout link details directly from Polar
   */
  async getCheckoutLink(id: string, useCache = true, forceRefresh = false) {
    const cacheKey = `polar:cache:checkout_link:${id}`;
    return await this.getOrSetCache(
      cacheKey,
      async () => {
        const polar = this.ensureConfigured();
        try {
          return await polar.checkoutLinks.get({ id });
        } catch (err: any) {
          if (
            err.statusCode === 404 ||
            err.status === 404 ||
            err.name === 'ResourceNotFound'
          ) {
            throw new NotFoundException(
              `Checkout link '${id}' was not found on Polar.`,
            );
          }
          if (
            err.statusCode === 422 ||
            err.status === 422 ||
            err.name === 'HTTPValidationError'
          ) {
            throw new BadRequestException(
              `Invalid checkout link ID format: ${id}`,
            );
          }
          throw err;
        }
      },
      useCache,
      forceRefresh,
    );
  }

  /**
   * Creates a Polar checkout session
   */
  async createCheckoutSession(params: CreateCheckoutSessionParams) {
    const polar = this.ensureConfigured();
    return await polar.checkouts.create({
      products: [params.productId],
      successUrl: params.successUrl,
      customerEmail: params.customerEmail || undefined,
      customerName: params.customerName || undefined,
      externalCustomerId: params.externalCustomerId || undefined,
      metadata: params.metadata || undefined,
    });
  }

  /**
   * Creates an authenticated customer portal session
   */
  async createCustomerSession(params: CreateCustomerSessionParams) {
    const polar = this.ensureConfigured();
    if (!params.customerId && !params.externalCustomerId) {
      throw new ServiceUnavailableException(
        'Either customerId or externalCustomerId must be provided.',
      );
    }
    return await polar.customerSessions.create(
      params.customerId
        ? { customerId: params.customerId }
        : { externalCustomerId: params.externalCustomerId! },
    );
  }

  /**
   * Executes a refund on Polar via Polar SDK
   */
  async createRefund(params: {
    orderId: string;
    reason: string;
    amount: number;
    comment?: string;
    revokeBenefits?: boolean;
  }) {
    const polar = this.ensureConfigured();
    return await polar.refunds.create({
      orderId: params.orderId,
      reason: params.reason as any,
      amount: params.amount,
      comment: params.comment,
      revokeBenefits: params.revokeBenefits ?? true,
    });
  }

  private cachedOrgId: string | null = null;

  async getOrganizationId(): Promise<string | undefined> {
    if (this.cachedOrgId) return this.cachedOrgId;
    const paymentConfig = this.configService.get('payment', { infer: true });
    if (paymentConfig?.organizationId) {
      this.cachedOrgId = paymentConfig.organizationId;
      return this.cachedOrgId;
    }
    try {
      const polar = this.ensureConfigured();
      const orgs = await polar.organizations.listOrganizations({});
      for await (const page of orgs) {
        if (page.result?.items?.[0]?.id) {
          this.cachedOrgId = page.result.items[0].id;
          return this.cachedOrgId;
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `Could not resolve default organization ID: ${err.message}`,
      );
    }
    return undefined;
  }

  // ==========================================
  // PRODUCTS CRUD
  // ==========================================

  async createProduct(dto: CreateProductReqDto) {
    const polar = this.ensureConfigured();
    const organizationId = await this.getOrganizationId();

    const prices: any[] =
      dto.prices && dto.prices.length > 0
        ? dto.prices.map((p) => {
            if (p.amountType === 'custom') {
              return {
                amountType: 'custom',
                priceCurrency: p.priceCurrency || 'usd',
                taxBehavior: p.taxBehavior,
                minimumAmount: p.minimumAmount,
                maximumAmount: p.maximumAmount,
                presetAmount: p.presetAmount,
              };
            }
            return {
              amountType: 'fixed',
              priceAmount: p.priceAmount ?? 0,
              priceCurrency: p.priceCurrency || 'usd',
              taxBehavior: p.taxBehavior,
            };
          })
        : [
            {
              amountType: 'fixed',
              priceAmount: dto.priceAmount ?? 0,
              priceCurrency: dto.currency || 'usd',
            },
          ];

    let created: any;
    if (dto.isRecurring) {
      created = await polar.products.create({
        name: dto.name,
        description: dto.description || undefined,
        visibility: dto.visibility,
        recurringInterval: dto.recurringInterval || 'month',
        recurringIntervalCount: dto.recurringIntervalCount || 1,
        trialInterval: dto.trialInterval,
        trialIntervalCount: dto.trialIntervalCount,
        meterInterval: dto.meterInterval,
        meterIntervalCount: dto.meterIntervalCount,
        medias: dto.medias && dto.medias.length > 0 ? dto.medias : undefined,
        metadata: dto.metadata,
        prices,
        organizationId: organizationId || undefined,
      });
    } else {
      created = await polar.products.create({
        name: dto.name,
        description: dto.description || undefined,
        visibility: dto.visibility,
        medias: dto.medias && dto.medias.length > 0 ? dto.medias : undefined,
        metadata: dto.metadata,
        prices,
        organizationId: organizationId || undefined,
      });
    }

    if (dto.benefits && dto.benefits.length > 0) {
      try {
        await polar.products.updateBenefits({
          id: created.id,
          productBenefitsUpdate: { benefits: dto.benefits },
        });
      } catch (err: any) {
        this.logger.warn(`Could not update product benefits: ${err.message}`);
      }
    }

    await this.clearCache('products');
    return created;
  }

  async updateProduct(id: string, dto: UpdateProductReqDto) {
    const polar = this.ensureConfigured();
    const productUpdate: any = {};
    if (dto.name !== undefined) productUpdate.name = dto.name;
    if (dto.description !== undefined)
      productUpdate.description = dto.description;
    if (dto.visibility !== undefined) productUpdate.visibility = dto.visibility;
    if (dto.isArchived !== undefined) productUpdate.isArchived = dto.isArchived;
    if (dto.trialInterval !== undefined)
      productUpdate.trialInterval = dto.trialInterval;
    if (dto.trialIntervalCount !== undefined)
      productUpdate.trialIntervalCount = dto.trialIntervalCount;
    if (dto.medias !== undefined) productUpdate.medias = dto.medias;
    if (dto.metadata !== undefined) productUpdate.metadata = dto.metadata;

    if (dto.prices && dto.prices.length > 0) {
      productUpdate.prices = dto.prices.map((p) => {
        if (p.amountType === 'custom') {
          return {
            amountType: 'custom',
            priceCurrency: p.priceCurrency || 'usd',
            taxBehavior: p.taxBehavior,
            minimumAmount: p.minimumAmount,
            maximumAmount: p.maximumAmount,
            presetAmount: p.presetAmount,
          };
        }
        return {
          amountType: 'fixed',
          priceAmount: p.priceAmount ?? 0,
          priceCurrency: p.priceCurrency || 'usd',
          taxBehavior: p.taxBehavior,
        };
      });
    } else if (dto.priceAmount !== undefined) {
      productUpdate.prices = [
        {
          amountType: 'fixed',
          priceAmount: dto.priceAmount,
          priceCurrency: dto.currency || 'usd',
        },
      ];
    }

    const updated = await polar.products.update({ id, productUpdate });

    if (dto.benefits !== undefined) {
      try {
        await polar.products.updateBenefits({
          id,
          productBenefitsUpdate: { benefits: dto.benefits },
        });
      } catch (err: any) {
        this.logger.warn(`Could not update product benefits: ${err.message}`);
      }
    }

    await this.clearCache('products');
    return updated;
  }

  async archiveProduct(id: string) {
    return await this.updateProduct(id, { isArchived: true });
  }

  // ==========================================
  // DISCOUNTS CRUD
  // ==========================================

  async createDiscount(dto: CreateDiscountReqDto) {
    const polar = this.ensureConfigured();
    const organizationId = await this.getOrganizationId();

    let created: any;
    if (dto.type === 'percentage') {
      created = await polar.discounts.create({
        name: dto.name,
        code: dto.code || undefined,
        type: 'percentage',
        basisPoints: dto.basisPoints ?? 0,
        duration: dto.duration,
        durationInMonths:
          dto.duration === 'repeating' ? dto.durationInMonths : undefined,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        maxRedemptions: dto.maxRedemptions || undefined,
        products:
          dto.products && dto.products.length > 0 ? dto.products : undefined,
        metadata: dto.metadata,
        organizationId: organizationId || undefined,
      });
    } else {
      created = await polar.discounts.create({
        name: dto.name,
        code: dto.code || undefined,
        type: 'fixed',
        amount: dto.amount ?? 0,
        currency: (dto.currency || 'usd') as any,
        amounts: dto.amounts,
        duration: dto.duration,
        durationInMonths:
          dto.duration === 'repeating' ? dto.durationInMonths : undefined,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        maxRedemptions: dto.maxRedemptions || undefined,
        products:
          dto.products && dto.products.length > 0 ? dto.products : undefined,
        metadata: dto.metadata,
        organizationId: organizationId || undefined,
      });
    }

    await this.clearCache('discounts');
    return created;
  }

  async updateDiscount(id: string, dto: UpdateDiscountReqDto) {
    const polar = this.ensureConfigured();
    const discountUpdate: any = {};
    if (dto.name !== undefined) discountUpdate.name = dto.name;
    if (dto.code !== undefined) discountUpdate.code = dto.code;
    if (dto.duration !== undefined) discountUpdate.duration = dto.duration;
    if (dto.durationInMonths !== undefined)
      discountUpdate.durationInMonths = dto.durationInMonths;
    if (dto.startsAt !== undefined)
      discountUpdate.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined)
      discountUpdate.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (dto.maxRedemptions !== undefined)
      discountUpdate.maxRedemptions = dto.maxRedemptions;
    if (dto.products !== undefined) discountUpdate.products = dto.products;
    if (dto.metadata !== undefined) discountUpdate.metadata = dto.metadata;
    if (dto.type !== undefined) discountUpdate.type = dto.type;
    if (dto.basisPoints !== undefined)
      discountUpdate.basisPoints = dto.basisPoints;
    if (dto.amount !== undefined) discountUpdate.amount = dto.amount;
    if (dto.currency !== undefined)
      discountUpdate.currency = dto.currency as any;
    if (dto.amounts !== undefined) discountUpdate.amounts = dto.amounts;

    const updated = await polar.discounts.update({ id, discountUpdate });
    await this.clearCache('discounts');
    return updated;
  }

  async deleteDiscount(id: string) {
    const polar = this.ensureConfigured();
    await polar.discounts.delete({ id });
    await this.clearCache('discounts');
    return { success: true, message: `Discount '${id}' deleted successfully.` };
  }

  // ==========================================
  // CHECKOUT LINKS CRUD
  // ==========================================

  async createCheckoutLink(dto: CreateCheckoutLinkReqDto) {
    const polar = this.ensureConfigured();
    const created = await polar.checkoutLinks.create({
      paymentProcessor: 'stripe',
      products: dto.products,
      label: dto.label || undefined,
      discountId: dto.discountId || undefined,
      allowDiscountCodes: dto.allowDiscountCodes,
      requireBillingAddress: dto.requireBillingAddress,
      trialInterval: dto.trialInterval,
      trialIntervalCount: dto.trialIntervalCount,
      seats: dto.seats,
      successUrl: dto.successUrl || undefined,
      returnUrl: dto.returnUrl || undefined,
      metadata: dto.metadata,
    });
    await this.clearCache('checkout-links');
    return created;
  }

  async updateCheckoutLink(id: string, dto: UpdateCheckoutLinkReqDto) {
    const polar = this.ensureConfigured();
    const checkoutLinkUpdate: any = {};
    if (dto.products !== undefined) checkoutLinkUpdate.products = dto.products;
    if (dto.label !== undefined) checkoutLinkUpdate.label = dto.label;
    if (dto.discountId !== undefined)
      checkoutLinkUpdate.discountId = dto.discountId;
    if (dto.allowDiscountCodes !== undefined)
      checkoutLinkUpdate.allowDiscountCodes = dto.allowDiscountCodes;
    if (dto.requireBillingAddress !== undefined)
      checkoutLinkUpdate.requireBillingAddress = dto.requireBillingAddress;
    if (dto.trialInterval !== undefined)
      checkoutLinkUpdate.trialInterval = dto.trialInterval;
    if (dto.trialIntervalCount !== undefined)
      checkoutLinkUpdate.trialIntervalCount = dto.trialIntervalCount;
    if (dto.seats !== undefined) checkoutLinkUpdate.seats = dto.seats;
    if (dto.successUrl !== undefined)
      checkoutLinkUpdate.successUrl = dto.successUrl;
    if (dto.returnUrl !== undefined)
      checkoutLinkUpdate.returnUrl = dto.returnUrl;
    if (dto.metadata !== undefined) checkoutLinkUpdate.metadata = dto.metadata;

    const updated = await polar.checkoutLinks.update({
      id,
      checkoutLinkUpdate,
    });
    await this.clearCache('checkout-links');
    return updated;
  }

  async deleteCheckoutLink(id: string) {
    const polar = this.ensureConfigured();
    await polar.checkoutLinks.delete({ id });
    await this.clearCache('checkout-links');
    return {
      success: true,
      message: `Checkout link '${id}' deleted successfully.`,
    };
  }

  /**
   * Validates Polar webhook signature using standardwebhooks
   */
  validateWebhookEvent(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Record<string, any> {
    if (!this.webhookSecret) {
      throw new ServiceUnavailableException(
        'POLAR_WEBHOOK_SECRET is not configured on the server.',
      );
    }

    const normalizedHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string') {
        normalizedHeaders[key] = value;
      } else if (Array.isArray(value)) {
        normalizedHeaders[key] = value.join(', ');
      }
    }

    try {
      const base64Secret = Buffer.from(this.webhookSecret, 'utf-8').toString(
        'base64',
      );
      const webhook = new Webhook(base64Secret);
      return webhook.verify(rawBody, normalizedHeaders) as Record<string, any>;
    } catch (err: any) {
      if (err instanceof WebhookVerificationError) {
        this.logger.warn('Polar webhook signature verification failed.');
        throw err;
      }
      throw err;
    }
  }

  /**
   * Uploads an image file directly to Polar product media via multipart S3
   * following Polar 2026-04 Files API specification
   */
  async uploadProductMedia(file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('File is required');
    }

    // Polar 2026-04 ProductMediaFileCreate specification:
    // Only image/(jpeg|png|gif|webp|svg+xml) allowed, maximum 10 MB (10485760 bytes)
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type '${file.mimetype}'. Only images are supported (jpeg, png, gif, webp, svg).`,
      );
    }
    const maxSizeBytes = 10485760; // 10MB
    if (file.size > maxSizeBytes || file.buffer.length > maxSizeBytes) {
      throw new BadRequestException(
        `File size exceeds the 10 MB limit allowed by Polar product media.`,
      );
    }

    const polar = this.ensureConfigured();
    const buffer = file.buffer;
    const sha256Base64 = crypto
      .createHash('sha256')
      .update(buffer)
      .digest('base64');

    // 1. Create file record on Polar (POST /v1/files/)
    const created = await polar.files.create({
      name: file.originalname,
      mimeType: file.mimetype,
      size: buffer.length,
      checksumSha256Base64: sha256Base64,
      service: 'product_media',
      upload: {
        parts: [
          {
            number: 1,
            chunkStart: 0,
            chunkEnd: buffer.length,
            checksumSha256Base64: sha256Base64,
          },
        ],
      },
    });

    // 2. Upload part to S3 presigned URL with SHA256 checksum headers
    const part = created.upload.parts[0];
    const s3Headers: Record<string, string> = {
      'x-amz-checksum-sha256': sha256Base64,
      'x-amz-sdk-checksum-algorithm': 'SHA256',
      ...(part.headers || {}),
    };

    const s3Response = await fetch(part.url, {
      method: 'PUT',
      body: buffer,
      headers: s3Headers,
    });

    if (!s3Response.ok) {
      const errText = await s3Response.text();
      this.logger.error(`Polar S3 media upload failed: ${errText}`);
      throw new BadRequestException('Failed to upload media to Polar storage.');
    }

    const etag = s3Response.headers.get('etag')?.replace(/"/g, '') || '';

    // 3. Complete file upload on Polar (POST /v1/files/{id}/uploaded)
    const completed = await polar.files.uploaded({
      id: created.id,
      fileUploadCompleted: {
        id: created.upload.id,
        path: created.upload.path,
        parts: [
          {
            number: 1,
            checksumEtag: etag,
            checksumSha256Base64: sha256Base64,
          },
        ],
      },
    });

    return {
      id: completed.id,
      name: completed.name,
      path: completed.path,
      mimeType: completed.mimeType,
      size: completed.size,
      service: completed.service,
      isUploaded: completed.isUploaded,
      publicUrl:
        (completed as any).publicUrl ||
        (completed as any).public_url ||
        (completed.path
          ? `https://polar-public-sandbox-files.s3.amazonaws.com/${completed.path}`
          : undefined),
      sizeReadable: (completed as any).sizeReadable,
    };
  }
}
