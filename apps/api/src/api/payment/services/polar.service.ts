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
import { Webhook, WebhookVerificationError } from 'standardwebhooks';

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
}
