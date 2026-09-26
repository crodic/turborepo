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
import {
  WebhookVerificationError as StandardWebhookVerificationError,
  Webhook,
} from 'standardwebhooks';

export class RFCDate {
  private serialized: string;
  constructor(date: Date | string) {
    const value = typeof date === 'string' ? new Date(date) : date;
    this.serialized = value.toISOString().slice(0, 10);
  }
  toJSON() {
    return this.serialized;
  }
  toString() {
    return this.serialized;
  }
}

export type CreateCheckoutParams = {
  productId: string;
  successUrl: string;
  returnUrl?: string;
  customerEmail?: string;
  customerName?: string;
  externalCustomerId?: string;
  customerId?: string;
  discountId?: string;
  allowDiscountCodes?: boolean;
  customFieldData?: Record<string, any>;
  customerBillingAddress?: any;
  customerTaxId?: string;
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
  private cachedOrganizationId?: string;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    const paymentConfig = this.configService.get('payment', { infer: true });
    const accessToken = paymentConfig?.accessToken;
    this.webhookSecret = paymentConfig?.webhookSecret;
    this.cachedOrganizationId = paymentConfig?.organizationId;
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

  isGatewayConfigured(): boolean {
    return this.isConfigured;
  }

  isOrganizationToken(): boolean {
    const paymentConfig = this.configService.get('payment', { infer: true });
    const token = paymentConfig?.accessToken || '';
    return token.startsWith('polar_oat_');
  }

  async getOrganizationIdForPayload(): Promise<string | undefined> {
    if (this.isOrganizationToken()) {
      return undefined;
    }
    return await this.getOrganizationId();
  }

  async getOrganizationId(): Promise<string | undefined> {
    if (this.cachedOrganizationId) {
      return this.cachedOrganizationId;
    }
    if (!this.isConfigured || !this.client) {
      return undefined;
    }
    try {
      const orgs: any = await this.listOrganizations({ limit: 1 });
      const items = orgs?.items || orgs?.result?.items;
      if (Array.isArray(items) && items.length > 0 && items[0]?.id) {
        this.cachedOrganizationId = items[0].id;
        return items[0].id;
      }
    } catch (e: any) {
      this.logger.debug(
        `Could not auto-resolve Polar organization ID: ${e?.message}`,
      );
    }
    return undefined;
  }

  // ==========================================
  // CHECKOUT & SESSIONS
  // ==========================================

  async createCheckoutSession(params: CreateCheckoutParams) {
    const polar = this.ensureConfigured();

    const checkoutPayload: any = {
      products: [params.productId],
      successUrl: params.successUrl,
    };

    if (params.returnUrl) checkoutPayload.returnUrl = params.returnUrl;
    if (params.customerEmail)
      checkoutPayload.customerEmail = params.customerEmail;
    if (params.customerName) checkoutPayload.customerName = params.customerName;
    if (params.externalCustomerId)
      checkoutPayload.externalCustomerId = params.externalCustomerId;
    if (params.customerId) checkoutPayload.customerId = params.customerId;
    if (params.discountId) checkoutPayload.discountId = params.discountId;
    if (params.allowDiscountCodes !== undefined)
      checkoutPayload.allowDiscountCodes = params.allowDiscountCodes;
    if (params.customFieldData)
      checkoutPayload.customFieldData = params.customFieldData;
    if (params.customerBillingAddress)
      checkoutPayload.customerBillingAddress = params.customerBillingAddress;
    if (params.customerTaxId)
      checkoutPayload.customerTaxId = params.customerTaxId;
    if (params.metadata)
      checkoutPayload.metadata = sanitizePolarMetadata(params.metadata);

    const checkout = await polar.checkouts.create(checkoutPayload);
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

  // ==========================================
  // PRODUCTS
  // ==========================================

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

  // ==========================================
  // BENEFITS & BENEFIT GRANTS
  // ==========================================

  async listBenefits() {
    const polar = this.ensureConfigured();
    const response = await polar.benefits.list({ limit: 100 });
    return (response as any)?.result?.items ?? (response as any)?.items ?? [];
  }

  async getBenefit(id: string) {
    const polar = this.ensureConfigured();
    return await polar.benefits.get({ id });
  }

  async createBenefit(params: {
    type: string;
    description: string;
    properties?: Record<string, any>;
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

  async updateBenefit(
    id: string,
    params: { description?: string; properties?: Record<string, any> },
  ) {
    const polar = this.ensureConfigured();
    this.logger.log(`Updating benefit "${id}" on Polar...`);
    return await polar.benefits.update({
      id,
      requestBody: {
        description: params.description,
        properties: params.properties,
      } as any,
    });
  }

  async deleteBenefit(id: string) {
    const polar = this.ensureConfigured();
    this.logger.log(`Deleting benefit "${id}" on Polar...`);
    return await polar.benefits.delete({ id });
  }

  async listBenefitGrants(params: {
    benefitId?: string;
    customerId?: string;
    page?: number;
    limit?: number;
  }) {
    const polar = this.ensureConfigured();
    if (params.benefitId) {
      return await polar.benefits.grants({
        id: params.benefitId,
        page: params.page || 1,
        limit: params.limit || 10,
      });
    }
    return await polar.benefitGrants.list({
      customerId: params.customerId,
      page: params.page || 1,
      limit: params.limit || 10,
    });
  }

  // ==========================================
  // DISCOUNTS
  // ==========================================

  async listDiscounts(params?: {
    page?: number;
    limit?: number;
    query?: string;
  }) {
    const polar = this.ensureConfigured();
    const response = await polar.discounts.list({
      page: params?.page || 1,
      limit: params?.limit || 10,
      query: params?.query || undefined,
    });
    return (response as any)?.result ?? response;
  }

  async getDiscount(id: string) {
    const polar = this.ensureConfigured();
    return await polar.discounts.get({ id });
  }

  async createDiscount(payload: any) {
    const polar = this.ensureConfigured();
    this.logger.log(`Creating discount "${payload.name}" on Polar...`);
    return await polar.discounts.create(payload);
  }

  async updateDiscount(id: string, payload: any) {
    const polar = this.ensureConfigured();
    this.logger.log(`Updating discount "${id}" on Polar...`);
    return await polar.discounts.update({
      id,
      discountUpdate: payload,
    });
  }

  async deleteDiscount(id: string) {
    const polar = this.ensureConfigured();
    this.logger.log(`Deleting discount "${id}" on Polar...`);
    return await polar.discounts.delete({ id });
  }

  // ==========================================
  // CUSTOM FIELDS
  // ==========================================

  async listCustomFields(params?: {
    page?: number;
    limit?: number;
    query?: string;
  }) {
    const polar = this.ensureConfigured();
    const response = await polar.customFields.list({
      page: params?.page || 1,
      limit: params?.limit || 10,
      query: params?.query || undefined,
    });
    return (response as any)?.result ?? response;
  }

  async getCustomField(id: string) {
    const polar = this.ensureConfigured();
    return await polar.customFields.get({ id });
  }

  async createCustomField(payload: any) {
    const polar = this.ensureConfigured();
    this.logger.log(`Creating custom field "${payload.name}" on Polar...`);
    return await polar.customFields.create(payload);
  }

  async updateCustomField(id: string, payload: any) {
    const polar = this.ensureConfigured();
    this.logger.log(`Updating custom field "${id}" on Polar...`);
    return await polar.customFields.update({
      id,
      customFieldUpdate: payload,
    });
  }

  async deleteCustomField(id: string) {
    const polar = this.ensureConfigured();
    this.logger.log(`Deleting custom field "${id}" on Polar...`);
    return await polar.customFields.delete({ id });
  }

  // ==========================================
  // CUSTOMERS
  // ==========================================

  async listCustomers(params?: {
    page?: number;
    limit?: number;
    query?: string;
    email?: string;
  }) {
    const polar = this.ensureConfigured();
    const response = await polar.customers.list({
      page: params?.page || 1,
      limit: params?.limit || 10,
      query: params?.query || undefined,
      email: params?.email || undefined,
    });
    return (response as any)?.result ?? response;
  }

  async getCustomer(id: string) {
    const polar = this.ensureConfigured();
    return await polar.customers.get({ id });
  }

  async createCustomer(payload: any) {
    const polar = this.ensureConfigured();
    this.logger.log(`Creating customer "${payload.email}" on Polar...`);
    return await polar.customers.create(payload);
  }

  async updateCustomer(id: string, payload: any) {
    const polar = this.ensureConfigured();
    this.logger.log(`Updating customer "${id}" on Polar...`);
    return await polar.customers.update({
      id,
      customerUpdate: payload,
    });
  }

  async deleteCustomer(id: string, anonymize?: boolean) {
    const polar = this.ensureConfigured();
    this.logger.log(
      `Deleting customer "${id}" on Polar (anonymize: ${anonymize})...`,
    );
    return await polar.customers.delete({
      id,
      ...(anonymize !== undefined ? { anonymize } : {}),
    } as any);
  }

  async getCustomerState(id: string) {
    const polar = this.ensureConfigured();
    return await polar.customers.getState({ id });
  }

  async listCustomerPaymentMethods(id: string) {
    const polar = this.ensureConfigured();
    const response = await polar.customers.listPaymentMethods({ id });
    return (response as any)?.result ?? response;
  }

  async exportCustomers() {
    const polar = this.ensureConfigured();
    return await polar.customers.export({});
  }

  // ==========================================
  // SUBSCRIPTIONS
  // ==========================================

  async listSubscriptions(params?: {
    page?: number;
    limit?: number;
    customerId?: string;
    productId?: string;
    active?: boolean;
  }) {
    const polar = this.ensureConfigured();
    const response = await polar.subscriptions.list({
      page: params?.page || 1,
      limit: params?.limit || 10,
      customerId: params?.customerId || undefined,
      productId: params?.productId || undefined,
      active: params?.active !== undefined ? params.active : undefined,
    });
    return (response as any)?.result ?? response;
  }

  async getSubscription(id: string) {
    const polar = this.ensureConfigured();
    return await polar.subscriptions.get({ id });
  }

  async updateSubscription(id: string, payload: any) {
    const polar = this.ensureConfigured();
    this.logger.log(`Updating subscription "${id}" on Polar...`);
    return await polar.subscriptions.update({
      id,
      subscriptionUpdate: payload,
    });
  }

  async cancelSubscription(id: string) {
    const polar = this.ensureConfigured();
    this.logger.log(`Canceling subscription "${id}" on Polar at period end...`);
    return await polar.subscriptions.update({
      id,
      subscriptionUpdate: {
        cancelAtPeriodEnd: true,
      } as any,
    });
  }

  async revokeSubscription(id: string) {
    const polar = this.ensureConfigured();
    this.logger.log(`Revoking subscription "${id}" immediately on Polar...`);
    return await polar.subscriptions.revoke({ id });
  }

  async exportSubscriptions() {
    const polar = this.ensureConfigured();
    return await polar.subscriptions.export({});
  }

  // ==========================================
  // ORDERS
  // ==========================================

  async listOrders(params?: {
    page?: number;
    limit?: number;
    customerId?: string;
    productId?: string;
  }) {
    const polar = this.ensureConfigured();
    const response = await polar.orders.list({
      page: params?.page || 1,
      limit: params?.limit || 10,
      customerId: params?.customerId || undefined,
      productId: params?.productId || undefined,
    });
    return (response as any)?.result ?? response;
  }

  async getOrder(id: string) {
    const polar = this.ensureConfigured();
    return await polar.orders.get({ id });
  }

  async getOrderInvoice(id: string) {
    const polar = this.ensureConfigured();
    return await polar.orders.invoice({ id });
  }

  async getOrderReceipt(id: string) {
    const polar = this.ensureConfigured();
    return await polar.orders.receipt({ id });
  }

  async exportOrders() {
    const polar = this.ensureConfigured();
    return await polar.orders.export({});
  }

  // ==========================================
  // REFUNDS
  // ==========================================

  async listRefunds(params?: {
    page?: number;
    limit?: number;
    orderId?: string;
    succeeded?: boolean;
  }) {
    const polar = this.ensureConfigured();
    const response = await polar.refunds.list({
      page: params?.page || 1,
      limit: params?.limit || 10,
      orderId: params?.orderId || undefined,
      succeeded: params?.succeeded,
    });
    return (response as any)?.result ?? response;
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

  // ==========================================
  // CHECKOUT LINKS
  // ==========================================

  async listCheckoutLinks(params?: {
    page?: number;
    limit?: number;
    productId?: string;
  }) {
    const polar = this.ensureConfigured();
    const response = await polar.checkoutLinks.list({
      page: params?.page || 1,
      limit: params?.limit || 10,
      productId: params?.productId || undefined,
    });
    return (response as any)?.result ?? response;
  }

  async getCheckoutLink(id: string) {
    const polar = this.ensureConfigured();
    return await polar.checkoutLinks.get({ id });
  }

  async createCheckoutLink(payload: any) {
    const polar = this.ensureConfigured();
    this.logger.log(`Creating checkout link on Polar...`);
    return await polar.checkoutLinks.create(payload);
  }

  async updateCheckoutLink(id: string, payload: any) {
    const polar = this.ensureConfigured();
    this.logger.log(`Updating checkout link "${id}" on Polar...`);
    return await polar.checkoutLinks.update({
      id,
      checkoutLinkUpdate: payload,
    });
  }

  async deleteCheckoutLink(id: string) {
    const polar = this.ensureConfigured();
    this.logger.log(`Deleting checkout link "${id}" on Polar...`);
    return await polar.checkoutLinks.delete({ id });
  }

  // ==========================================
  // METRICS & ANALYTICS
  // ==========================================

  async getMetrics(params: {
    startDate: Date | string;
    endDate: Date | string;
    interval: 'day' | 'week' | 'month' | 'year';
    organizationId?: string;
    productId?: string;
    customerId?: string;
    metrics?: string[];
  }) {
    const polar = this.ensureConfigured();
    return await polar.metrics.get({
      startDate: new RFCDate(params.startDate) as any,
      endDate: new RFCDate(params.endDate) as any,
      interval: params.interval as any,
      organizationId: params.organizationId || undefined,
      productId: params.productId || undefined,
      customerId: params.customerId || undefined,
      metrics: params.metrics || undefined,
    });
  }

  async getMetricsLimits() {
    const polar = this.ensureConfigured();
    return await polar.metrics.limits();
  }

  // ==========================================
  // ORGANIZATIONS
  // ==========================================

  async listOrganizations(params?: { page?: number; limit?: number }) {
    const polar = this.ensureConfigured();
    const response = await polar.organizations.listOrganizations({
      page: params?.page || 1,
      limit: params?.limit || 10,
    });
    return (response as any)?.result ?? response;
  }

  async getOrganization(id: string) {
    const polar = this.ensureConfigured();
    return await polar.organizations.get({ id });
  }

  // ==========================================
  // WEBHOOK VALIDATION
  // ==========================================

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
      return validateEvent(
        rawBody,
        normalizedHeaders,
        this.webhookSecret,
      ) as Record<string, any>;
    } catch (err: any) {
      if (err instanceof WebhookVerificationError) {
        this.logger.warn('Polar webhook signature verification failed.');
        throw err;
      }

      // If SDKValidationError occurred (e.g. unknown event type like discount.created, custom_field.created),
      // verify cryptographic signature using standardwebhooks and return the validated JSON payload directly.
      try {
        const base64Secret = Buffer.from(this.webhookSecret, 'utf-8').toString(
          'base64',
        );
        const webhook = new Webhook(base64Secret);
        const parsed = webhook.verify(rawBody, normalizedHeaders) as Record<
          string,
          any
        >;
        this.logger.log(
          `Verified Polar webhook event with payload type "${parsed?.type}" (unparsed by SDK schema).`,
        );
        return parsed;
      } catch (verifyErr) {
        if (verifyErr instanceof StandardWebhookVerificationError) {
          this.logger.warn('Polar webhook signature verification failed.');
          throw new WebhookVerificationError(verifyErr.message);
        }
        throw err;
      }
    }
  }
}
