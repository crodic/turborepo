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
    interval: 'monthly' | 'yearly' | 'one_time';
    price: number;
    currency: string;
    isFree?: boolean;
    metadata?: Record<string, any>;
    visibility?: 'public' | 'private';
  }) {
    const polar = this.ensureConfigured();
    const currency = (params.currency || 'usd').toLowerCase();
    const isZeroDecimal = currency === 'vnd' || currency === 'jpy';
    const isFree = Boolean(params.isFree || params.price === 0);
    const priceAmount = isFree
      ? 0
      : isZeroDecimal
        ? params.price
        : Math.round(params.price * 100);

    const priceObj: any = {
      amountType: 'fixed',
      priceAmount,
      priceCurrency: currency,
    };

    let createPayload: any;
    if (params.interval === 'one_time') {
      createPayload = {
        name: params.name,
        description: params.description || undefined,
        prices: [priceObj],
        metadata: params.metadata,
        visibility: params.visibility || 'public',
      };
    } else {
      createPayload = {
        name: params.name,
        description: params.description || undefined,
        recurringInterval: params.interval === 'monthly' ? 'month' : 'year',
        prices: [priceObj],
        metadata: params.metadata,
        visibility: params.visibility || 'public',
      };
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
      isFree?: boolean;
    },
  ) {
    const polar = this.ensureConfigured();
    const productUpdate: any = {};

    if (params.name !== undefined) productUpdate.name = params.name;
    if (params.description !== undefined) {
      productUpdate.description = params.description;
    }
    if (params.metadata !== undefined) productUpdate.metadata = params.metadata;
    if (params.visibility !== undefined) {
      productUpdate.visibility = params.visibility;
    }
    if (params.isArchived !== undefined) {
      productUpdate.isArchived = params.isArchived;
    }

    if (params.price !== undefined) {
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
