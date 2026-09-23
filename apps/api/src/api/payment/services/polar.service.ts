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

  async listProducts() {
    const polar = this.ensureConfigured();
    return await polar.products.list({});
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
