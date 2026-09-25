import { AllConfigType } from '@/config/config.type';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Polar } from '@polar-sh/sdk';
import {
  validateEvent,
  WebhookVerificationError,
} from '@polar-sh/sdk/webhooks';

export type CreateCheckoutParams = {
  productId: string;
  successUrl: string;
  customerEmail?: string;
  customerName?: string;
  externalCustomerId?: string;
  metadata?: Record<string, any>;
};

export type CreateCustomerSessionParams = {
  customerId?: string;
  externalCustomerId?: string;
};

export function sanitizePolarMetadata(
  meta?: Record<string, any>,
): Record<string, string | number | boolean> {
  if (!meta || typeof meta !== 'object') return {};
  const cleaned: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === 'boolean') {
      cleaned[key] = value;
    } else if (typeof value === 'number' && !Number.isNaN(value)) {
      cleaned[key] = value;
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        cleaned[key] = trimmed;
      }
    }
  }
  return cleaned;
}

@Injectable()
export class PolarService {
  private readonly logger = new Logger(PolarService.name);
  private client: Polar | null = null;
  private readonly webhookSecret?: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
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
      this.logger.log(
        `Polar SDK initialized successfully in [${server}] mode.`,
      );
    } else {
      this.isConfigured = false;
      this.logger.warn(
        'POLAR_ACCESS_TOKEN is not configured. Polar Payment Gateway will run in dormant/disabled mode.',
      );
    }
  }

  private ensureConfigured(): Polar {
    if (!this.client || !this.isConfigured) {
      throw new ServiceUnavailableException(
        'Polar Payment Gateway is not configured. Please set POLAR_ACCESS_TOKEN in environment variables.',
      );
    }
    return this.client;
  }

  async createCheckoutSession(params: CreateCheckoutParams) {
    const polar = this.ensureConfigured();

    const checkout = await polar.checkouts.create({
      products: [params.productId],
      successUrl: params.successUrl,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      externalCustomerId: params.externalCustomerId,
      metadata: params.metadata,
    });

    return checkout;
  }

  async createCustomerSession(params: CreateCustomerSessionParams) {
    const polar = this.ensureConfigured();

    if (!params.customerId && !params.externalCustomerId) {
      throw new ServiceUnavailableException(
        'Either customerId or externalCustomerId must be provided to create a Customer Portal session.',
      );
    }

    const session = await polar.customerSessions.create(
      params.customerId
        ? { customerId: params.customerId }
        : { externalCustomerId: params.externalCustomerId! },
    );

    return session;
  }

  isGatewayConfigured(): boolean {
    return this.isConfigured;
  }

  async listProducts() {
    const polar = this.ensureConfigured();
    return await polar.products.list({});
  }

  async createPolarProduct(params: {
    name: string;
    description?: string;
    interval: string;
    intervalCount?: number;
    price: number;
    currency: string;
    prices?: Array<{ amount: number; currency: string }>;
    isFree?: boolean;
    metadata?: Record<string, any>;
    visibility?: 'public' | 'private';
    trialInterval?: string;
    trialIntervalCount?: number;
  }) {
    const polar = this.ensureConfigured();

    let pricesList: any[] = [];
    if (params.prices && params.prices.length > 0) {
      pricesList = params.prices.map((p) => {
        const curr = (p.currency || 'usd').toLowerCase();
        const isZeroDecimal = curr === 'vnd' || curr === 'jpy';
        const isFree = Boolean(params.isFree || p.amount === 0);
        return {
          amountType: 'fixed',
          priceCurrency: curr,
          priceAmount: isFree
            ? 0
            : isZeroDecimal
              ? p.amount
              : Math.round(p.amount * 100),
        };
      });
    } else {
      const currency = (params.currency || 'usd').toLowerCase();
      const isZeroDecimal = currency === 'vnd' || currency === 'jpy';
      const isFree = Boolean(params.isFree || params.price === 0);
      const priceAmount = isFree
        ? 0
        : isZeroDecimal
          ? params.price
          : Math.round(params.price * 100);

      pricesList = [
        {
          amountType: 'fixed',
          priceAmount,
          priceCurrency: currency,
        },
      ];
    }

    let recurringInterval: 'day' | 'week' | 'month' | 'year' | undefined;
    if (params.interval !== 'one_time') {
      const intervalMap: Record<string, 'day' | 'week' | 'month' | 'year'> = {
        daily: 'day',
        day: 'day',
        weekly: 'week',
        week: 'week',
        monthly: 'month',
        month: 'month',
        yearly: 'year',
        year: 'year',
      };
      recurringInterval = intervalMap[params.interval] || 'month';
    }

    const createPayload: any = {
      name: params.name,
      description: params.description || undefined,
      prices: pricesList,
      metadata: sanitizePolarMetadata(params.metadata),
      visibility: params.visibility || 'public',
    };

    if (recurringInterval) {
      createPayload.recurringInterval = recurringInterval;
      createPayload.recurringIntervalCount = params.intervalCount || 1;
    }

    if (params.trialInterval) {
      const trialMap: Record<string, 'day' | 'week' | 'month' | 'year'> = {
        daily: 'day',
        day: 'day',
        weekly: 'week',
        week: 'week',
        monthly: 'month',
        month: 'month',
        yearly: 'year',
        year: 'year',
      };
      createPayload.trialInterval = trialMap[params.trialInterval] || 'day';
      createPayload.trialIntervalCount = params.trialIntervalCount || 1;
    }

    this.logger.log(
      `Creating product "${params.name}" (${params.interval}) on Polar...`,
    );
    return await polar.products.create(createPayload);
  }

  async updatePolarProduct(
    polarProductId: string,
    params: {
      name?: string;
      description?: string;
      metadata?: Record<string, any>;
      visibility?: 'public' | 'private';
      isArchived?: boolean;
      price?: number;
      currency?: string;
      prices?: Array<{ amount: number; currency: string }>;
      isFree?: boolean;
      trialInterval?: string;
      trialIntervalCount?: number;
    },
  ) {
    const polar = this.ensureConfigured();
    const productUpdate: any = {};

    if (params.name !== undefined) productUpdate.name = params.name;
    if (params.description !== undefined) {
      productUpdate.description = params.description;
    }
    if (params.metadata !== undefined) {
      productUpdate.metadata = sanitizePolarMetadata(params.metadata);
    }
    if (params.visibility !== undefined) {
      productUpdate.visibility = params.visibility;
    }
    if (params.isArchived !== undefined) {
      productUpdate.isArchived = params.isArchived;
    }
    if (params.trialInterval !== undefined) {
      if (params.trialInterval) {
        const trialMap: Record<string, 'day' | 'week' | 'month' | 'year'> = {
          daily: 'day',
          day: 'day',
          weekly: 'week',
          week: 'week',
          monthly: 'month',
          month: 'month',
          yearly: 'year',
          year: 'year',
        };
        productUpdate.trialInterval = trialMap[params.trialInterval] || null;
      } else {
        productUpdate.trialInterval = null;
      }
    }
    if (params.trialIntervalCount !== undefined) {
      productUpdate.trialIntervalCount = params.trialIntervalCount;
    }

    if (params.prices && params.prices.length > 0) {
      productUpdate.prices = params.prices.map((p) => {
        const curr = (p.currency || 'usd').toLowerCase();
        const isZeroDecimal = curr === 'vnd' || curr === 'jpy';
        const isFree = Boolean(params.isFree || p.amount === 0);
        return {
          amountType: 'fixed',
          priceCurrency: curr,
          priceAmount: isFree
            ? 0
            : isZeroDecimal
              ? p.amount
              : Math.round(p.amount * 100),
        };
      });
    } else if (params.price !== undefined) {
      const currency = (params.currency || 'usd').toLowerCase();
      const isZeroDecimal = currency === 'vnd' || currency === 'jpy';
      const isFree = Boolean(params.isFree || params.price === 0);
      const priceAmount = isFree
        ? 0
        : isZeroDecimal
          ? params.price
          : Math.round(params.price * 100);

      productUpdate.prices = [
        {
          amountType: 'fixed',
          priceAmount,
          priceCurrency: currency,
        },
      ];
    }

    this.logger.log(`Updating Polar product ${polarProductId}...`);
    return await polar.products.update({
      id: polarProductId,
      productUpdate,
    });
  }

  async updateProductBenefits(polarProductId: string, benefitIds: string[]) {
    const polar = this.ensureConfigured();
    this.logger.log(
      `Updating benefits for Polar product ${polarProductId}: ${benefitIds.join(', ')}`,
    );
    return await polar.products.updateBenefits({
      id: polarProductId,
      productBenefitsUpdate: {
        benefits: benefitIds,
      },
    });
  }

  async archivePolarProduct(polarProductId: string) {
    const polar = this.ensureConfigured();
    this.logger.log(`Archiving Polar product ${polarProductId}...`);
    return await polar.products.update({
      id: polarProductId,
      productUpdate: {
        isArchived: true,
      },
    });
  }

  async deletePolarProduct(polarProductId: string) {
    return await this.archivePolarProduct(polarProductId);
  }

  async listBenefits() {
    const polar = this.ensureConfigured();
    const response = await polar.benefits.list({ limit: 100 });
    return (response as any)?.result?.items ?? (response as any)?.items ?? [];
  }

  async createBenefit(params: {
    type: string;
    description: string;
    properties?: { note?: string };
  }) {
    const polar = this.ensureConfigured();
    const payload: any = {
      type: params.type || 'custom',
      description: params.description,
      properties: params.properties || {},
    };
    this.logger.log(
      `Creating benefit "${params.description}" (${payload.type}) on Polar...`,
    );
    return await polar.benefits.create(payload);
  }

  async deleteBenefit(id: string) {
    const polar = this.ensureConfigured();
    this.logger.log(`Deleting benefit "${id}" on Polar...`);
    return await polar.benefits.delete({ id });
  }

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

  validateWebhookEvent(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
  ) {
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
      return validateEvent(rawBody, normalizedHeaders, this.webhookSecret);
    } catch (err) {
      if (err instanceof WebhookVerificationError) {
        this.logger.warn('Polar webhook signature verification failed.');
      }
      throw err;
    }
  }
}
