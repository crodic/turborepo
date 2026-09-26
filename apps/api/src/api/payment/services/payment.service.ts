import {
  AdminNotificationType,
  NotificationService,
} from '@/api/notification/notification.service';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { MailService } from '@/mail/mail.service';
import {
  BadRequestException,
  ConflictException,
  forwardRef,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import crypto from 'crypto';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CreateCheckoutReqDto } from '../dto/create-checkout.req.dto';
import { CreateCheckoutResDto } from '../dto/create-checkout.res.dto';
import { CreateRefundRequestReqDto } from '../dto/create-refund-request.req.dto';
import { CustomerPortalReqDto } from '../dto/customer-portal.req.dto';
import { CustomerPortalResDto } from '../dto/customer-portal.res.dto';
import { DirectRefundReqDto } from '../dto/direct-refund.req.dto';
import { PaymentOrderResDto } from '../dto/payment-order.res.dto';
import { PaymentRefundRequestResDto } from '../dto/payment-refund-request.res.dto';
import { PaymentSubscriptionResDto } from '../dto/payment-subscription.res.dto';
import { PaymentTransactionResDto } from '../dto/payment-transaction.res.dto';
import { ReviewRefundRequestReqDto } from '../dto/review-refund-request.req.dto';
import {
  PaymentCustomerEntity,
  PolarCustomerEntity,
} from '../entities/polar-customer.entity';
import {
  PaymentOrderEntity,
  PaymentOrderStatus,
  PolarOrderEntity,
} from '../entities/polar-order.entity';
import {
  PaymentRefundRequestStatus,
  PolarRefundRequestEntity,
} from '../entities/polar-refund-request.entity';
import {
  PaymentSubscriptionEntity,
  PaymentSubscriptionStatus,
  PolarSubscriptionEntity,
} from '../entities/polar-subscription.entity';
import {
  PaymentTransactionStatus,
  PaymentTransactionType,
  PolarTransactionEntity,
} from '../entities/polar-transaction.entity';
import {
  PaymentWebhookStatus,
  PolarWebhookEventEntity,
} from '../entities/polar-webhook-event.entity';
import { PaymentGatewayFactory } from '../factories/payment-gateway.factory';
import { CustomFieldService } from './custom-field.service';
import { DiscountService } from './discount.service';
import { PolarService } from './polar.service';
import { ProductService } from './product.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(PolarCustomerEntity)
    private readonly customerRepo: Repository<PolarCustomerEntity>,
    @InjectRepository(PolarOrderEntity)
    private readonly orderRepo: Repository<PolarOrderEntity>,
    @InjectRepository(PolarRefundRequestEntity)
    private readonly refundRequestRepo: Repository<PolarRefundRequestEntity>,
    @InjectRepository(PolarTransactionEntity)
    private readonly transactionRepo: Repository<PolarTransactionEntity>,
    @InjectRepository(PolarSubscriptionEntity)
    private readonly subscriptionRepo: Repository<PolarSubscriptionEntity>,
    @InjectRepository(PolarWebhookEventEntity)
    private readonly webhookEventRepo: Repository<PolarWebhookEventEntity>,
    private readonly gatewayFactory: PaymentGatewayFactory,
    private readonly productService: ProductService,
    private readonly polarService: PolarService,
    private readonly notificationService: NotificationService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService<AllConfigType>,
    @Inject(forwardRef(() => DiscountService))
    private readonly discountService: DiscountService,
    @Inject(forwardRef(() => CustomFieldService))
    private readonly customFieldService: CustomFieldService,
  ) {}

  /**
   * Generates a collision-resistant unique order reference number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `ORD-${timestamp}-${randomHex}`;
  }

  /**
   * Helper: Resolves internal user ID by email lookup in users table
   */
  private async resolveUserIdByEmail(
    email?: string | null,
  ): Promise<string | null> {
    if (!email || !this.customerRepo?.manager?.query) return null;
    try {
      const user = await this.customerRepo.manager.query(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [email],
      );
      return user?.[0]?.id ? String(user[0].id) : null;
    } catch {
      return null;
    }
  }

  /**
   * Helper: Finds an existing local customer profile by userId or email
   */
  private async findLocalCustomer(
    userId?: AutoIncrementID | string | null,
    email?: string | null,
  ): Promise<PaymentCustomerEntity | null> {
    if (userId) {
      const customer = await this.customerRepo.findOne({
        where: { userId: userId as AutoIncrementID },
      });
      if (customer) return customer;
    }
    if (email) {
      return await this.customerRepo.findOne({ where: { email } });
    }
    return null;
  }

  /**
   * Creates a checkout session via Polar and stores a pending order
   */
  async createCheckout(
    dto: CreateCheckoutReqDto,
    currentUser?: { id?: string | number; email?: string; fullName?: string },
  ): Promise<CreateCheckoutResDto> {
    // 1. Resolve product configuration from DB
    const product = await this.productService.getProductBySlugAndInterval(
      dto.planSlug,
      dto.interval,
    );

    if (product.isFree) {
      throw new BadRequestException(
        'Cannot initiate payment checkout for a free plan.',
      );
    }

    const polarProductId = product.polarProductId || dto.productId;
    if (!polarProductId) {
      throw new BadRequestException(
        `Pricing plan "${dto.planSlug}" (${dto.interval}) does not have a Polar Product ID configured. Please contact support.`,
      );
    }

    // 2. Resolve user identity
    let userId =
      dto.userId || (currentUser?.id ? String(currentUser.id) : undefined);
    const customerEmail = dto.customerEmail || currentUser?.email;
    const customerName = dto.customerName || currentUser?.fullName;

    if (!userId && customerEmail) {
      userId = (await this.resolveUserIdByEmail(customerEmail)) || undefined;
    }

    const orderNumber = this.generateOrderNumber();
    const customer = await this.findLocalCustomer(userId, customerEmail);

    const provider = this.gatewayFactory.getProvider(dto.gateway || 'polar');

    // 3. Create pending order record in database
    const order = this.orderRepo.create({
      orderNumber,
      userId: (userId as AutoIncrementID) || null,
      customerId: customer?.id || null,
      customerEmail: customerEmail || customer?.email || 'unknown@example.com',
      customerName: customerName || customer?.name || null,
      productId: polarProductId,
      productTitle: product.name,
      amount: product.price ? product.price * 100 : 0,
      currency: product.currency || 'usd',
      status: PaymentOrderStatus.PENDING,
      metadata: {
        ...dto.metadata,
        gateway: provider.name,
        planSlug: product.planSlug,
        interval: product.interval,
        orderNumber,
      },
    });
    await this.orderRepo.save(order);

    // 4. Call Payment Gateway Provider to generate checkout session
    try {
      const checkout = await provider.createCheckoutSession({
        productId: polarProductId,
        orderNumber,
        amount: product.price ? product.price * 100 : 0,
        currency: product.currency || 'usd',
        successUrl: dto.successUrl,
        customerEmail: customerEmail || undefined,
        customerName: customerName || undefined,
        externalCustomerId: userId,
        metadata: {
          ...dto.metadata,
          gateway: provider.name,
          orderNumber,
          localOrderId: String(order.id),
          planSlug: product.planSlug,
          interval: product.interval,
        },
      });

      // Update order with Provider Checkout Session ID and values
      order.polarCheckoutId = checkout.providerCheckoutId || null;
      if (checkout.amount) order.amount = checkout.amount;
      if (checkout.currency) order.currency = checkout.currency;
      await this.orderRepo.save(order);

      this.logger.log(
        `Checkout session created: ${checkout.providerCheckoutId || checkout.checkoutUrl} for order ${orderNumber} via [${provider.name}] (plan: ${product.planSlug})`,
      );

      return {
        checkoutUrl: checkout.checkoutUrl,
        checkoutId: checkout.providerCheckoutId || '',
        orderNumber,
      };
    } catch (error: any) {
      order.status = PaymentOrderStatus.FAILED;
      await this.orderRepo.save(order);

      this.logger.error(
        `Failed to create [${provider.name}] checkout: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadRequestException(
        'Failed to create checkout session. Please verify payment configuration and try again.',
      );
    }
  }

  /**
   * Generates a customer billing portal URL
   */
  async createCustomerPortalSession(
    dto: CustomerPortalReqDto,
    currentUser?: { id?: string | number; email?: string },
  ): Promise<CustomerPortalResDto> {
    const userId =
      dto.userId || (currentUser?.id ? String(currentUser.id) : undefined);
    const email = dto.customerEmail || currentUser?.email;

    let customerId = dto.customerId;

    // Lookup customer from database if not directly provided
    if (!customerId) {
      const customer = await this.findLocalCustomer(userId, email);
      if (customer) {
        customerId = customer.polarCustomerId;
      }
    }

    if (!customerId && !userId) {
      throw new BadRequestException(
        'Could not find a valid Polar customer profile. Provide a customerId or customerEmail with active transactions.',
      );
    }

    const provider = this.gatewayFactory.getProvider('polar');
    if (!provider.createCustomerPortalSession) {
      throw new BadRequestException(
        `Customer portal is not supported by [${provider.name}] gateway.`,
      );
    }

    try {
      const session = await provider.createCustomerPortalSession({
        customerId: customerId || undefined,
        externalCustomerId: !customerId ? userId : undefined,
      });

      return {
        portalUrl: session.portalUrl,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to create customer portal session via [${provider.name}]: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadRequestException(
        'Failed to open customer billing portal. Please try again later.',
      );
    }
  }

  /**
   * Handles incoming Polar webhook events with idempotency guarantees
   */
  async handleWebhook(
    event: Record<string, any>,
    webhookId?: string,
  ): Promise<void> {
    const eventType = event.type as string;
    const data = (event.data || {}) as Record<string, any>;
    const eventId =
      webhookId ||
      (event.id as string) ||
      (data.id ? `${eventType}_${data.id}` : null) ||
      crypto.randomUUID();

    this.logger.log(
      `Processing Polar webhook event: ${eventType} (${eventId})`,
    );

    // Idempotency check: verify if event was already handled
    const existingEvent = await this.webhookEventRepo.findOne({
      where: { eventId },
    });
    if (
      existingEvent &&
      existingEvent.status === PaymentWebhookStatus.PROCESSED
    ) {
      this.logger.log(`Webhook event ${eventId} already processed. Skipping.`);
      return;
    }

    // Save or update incoming event record
    const webhookEvent =
      existingEvent ||
      this.webhookEventRepo.create({
        eventId,
        eventType,
        payload: event,
        status: PaymentWebhookStatus.PENDING,
      });
    await this.webhookEventRepo.save(webhookEvent);

    try {
      switch (eventType) {
        case 'product.created':
        case 'product.updated':
          await this.productService.syncProductFromPolar(data);
          break;

        case 'product.deleted':
          await this.productService.deleteProductByPolarId(data.id);
          break;

        case 'discount.created':
        case 'discount.updated':
          await this.discountService.syncDiscountFromPolar(data);
          break;

        case 'discount.deleted':
          await this.discountService.deleteDiscountByPolarId(data.id);
          break;

        case 'custom_field.created':
        case 'custom_field.updated':
          await this.customFieldService.syncCustomFieldFromPolar(data);
          break;

        case 'custom_field.deleted':
          await this.customFieldService.deleteCustomFieldByPolarId(data.id);
          break;

        case 'customer.created':
        case 'customer.updated':
        case 'customer.state_changed': {
          const cId = data.id || data.customer_id;
          const cEmail = data.email;
          const cUserId =
            data.external_id || (await this.resolveUserIdByEmail(cEmail));
          if (cId && cEmail) {
            await this.syncCustomer(
              cId,
              cEmail,
              cUserId,
              data.name,
              data.avatar_url,
              data.billing_address,
              data.tax_id,
            );
          }
          break;
        }

        case 'customer.deleted': {
          const c = await this.customerRepo.findOne({
            where: { polarCustomerId: data.id },
          });
          if (c) {
            await this.customerRepo.remove(c);
          }
          break;
        }

        case 'order.created':
        case 'order.paid':
        case 'order.updated':
          await this.handleOrderPaid(data);
          break;

        case 'subscription.created':
        case 'subscription.active':
        case 'subscription.updated':
        case 'subscription.uncanceled':
        case 'subscription.resumed':
          await this.handleSubscriptionUpdated(data);
          break;

        case 'subscription.canceled':
        case 'subscription.revoked':
        case 'subscription.paused':
        case 'subscription.past_due':
          await this.handleSubscriptionCanceled(data);
          break;

        case 'order.refunded':
        case 'refund.created':
        case 'refund.updated':
          await this.handleOrderRefunded(data);
          break;

        default:
          this.logger.debug(`Unhandled webhook event type: ${eventType}`);
      }

      webhookEvent.status = PaymentWebhookStatus.PROCESSED;
      webhookEvent.processedAt = new Date();
      await this.webhookEventRepo.save(webhookEvent);
    } catch (err: any) {
      webhookEvent.status = PaymentWebhookStatus.FAILED;
      webhookEvent.errorMessage = err.message;
      await this.webhookEventRepo.save(webhookEvent);
      this.logger.error(
        `Error processing webhook event ${eventId}: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  /**
   * Helper: Synchronizes Polar customer record with local database
   */
  private async syncCustomer(
    polarCustomerId: string,
    email: string,
    userId?: AutoIncrementID | string | null,
    name?: string | null,
    avatarUrl?: string | null,
    billingAddress?: Record<string, any> | null,
    taxId?: string | null,
  ): Promise<PaymentCustomerEntity> {
    let customer = await this.customerRepo.findOne({
      where: { polarCustomerId },
    });

    const parsedUserId = userId ? (userId as AutoIncrementID) : null;

    if (!customer) {
      customer = this.customerRepo.create({
        polarCustomerId,
        email,
        userId: parsedUserId,
        name: name || null,
        avatarUrl: avatarUrl || null,
        billingAddress: billingAddress || null,
        taxId: taxId || null,
      });
    } else {
      if (parsedUserId && !customer.userId) customer.userId = parsedUserId;
      if (email && customer.email !== email) customer.email = email;
      if (name && !customer.name) customer.name = name;
      if (avatarUrl && !customer.avatarUrl) customer.avatarUrl = avatarUrl;
      if (billingAddress && !customer.billingAddress)
        customer.billingAddress = billingAddress;
      if (taxId && !customer.taxId) customer.taxId = taxId;
    }

    return await this.customerRepo.save(customer);
  }

  /**
   * Webhook handler: Processes paid order events and records ledger transaction
   */
  private async handleOrderPaid(data: Record<string, any>): Promise<void> {
    const polarOrderId = data.id;
    const checkoutId = data.checkout_id;
    const customerData = data.customer || {};
    const polarCustomerId = customerData.id || data.customer_id;
    const customerEmail = customerData.email || data.customer_email;
    const customerName = customerData.name || data.customer_name;
    const orderNumber = data.metadata?.orderNumber;

    const userId =
      customerData.external_id ||
      data.metadata?.userId ||
      (await this.resolveUserIdByEmail(customerEmail));

    let customer: PaymentCustomerEntity | null = null;
    if (polarCustomerId && customerEmail) {
      customer = await this.syncCustomer(
        polarCustomerId,
        customerEmail,
        userId,
        customerName,
      );
    }

    // Locate order by checkoutId, metadata orderNumber, or polarOrderId
    let order: PaymentOrderEntity | null = null;
    if (checkoutId) {
      order = await this.orderRepo.findOne({
        where: { polarCheckoutId: checkoutId },
      });
    }
    if (!order && orderNumber) {
      order = await this.orderRepo.findOne({ where: { orderNumber } });
    }
    if (!order && polarOrderId) {
      order = await this.orderRepo.findOne({ where: { polarOrderId } });
    }

    if (!order) {
      order = this.orderRepo.create({
        orderNumber: orderNumber || this.generateOrderNumber(),
        polarOrderId,
        polarCheckoutId: checkoutId || null,
        userId: (userId as AutoIncrementID) || null,
        customerId: customer?.id || null,
        customerEmail: customerEmail || 'unknown@example.com',
        customerName: customerName || null,
        productId: data.product_id || data.product?.id || 'unknown',
        productTitle: data.product?.name || null,
        amount: data.amount || 0,
        currency: data.currency || 'usd',
        subtotalAmount: data.subtotal_amount ?? data.amount ?? 0,
        taxAmount: data.tax_amount ?? null,
        discountAmount: data.discount_amount ?? null,
        discountId: data.discount_id ?? null,
        customFieldData: data.custom_field_data ?? null,
        invoiceUrl: data.invoice_url ?? null,
        receiptUrl: data.receipt_url ?? null,
        status: PaymentOrderStatus.PAID,
        metadata: data.metadata || null,
      });
    } else {
      order.status = PaymentOrderStatus.PAID;
      order.polarOrderId = polarOrderId;
      if (data.amount) order.amount = data.amount;
      if (data.currency) order.currency = data.currency;
      if (data.subtotal_amount !== undefined)
        order.subtotalAmount = data.subtotal_amount;
      if (data.tax_amount !== undefined) order.taxAmount = data.tax_amount;
      if (data.discount_amount !== undefined)
        order.discountAmount = data.discount_amount;
      if (data.discount_id !== undefined) order.discountId = data.discount_id;
      if (data.custom_field_data !== undefined)
        order.customFieldData = data.custom_field_data;
      if (data.invoice_url !== undefined) order.invoiceUrl = data.invoice_url;
      if (data.receipt_url !== undefined) order.receiptUrl = data.receipt_url;
      if (customer?.id && !order.customerId) order.customerId = customer.id;
      if (data.product?.name) order.productTitle = data.product.name;
      if (userId && !order.userId) order.userId = userId as AutoIncrementID;
    }
    await this.orderRepo.save(order);

    // Record ledger transaction
    const existingTx = await this.transactionRepo.findOne({
      where: { polarPaymentId: polarOrderId },
    });
    if (!existingTx) {
      const transaction = this.transactionRepo.create({
        userId: order.userId || null,
        orderId: order.id,
        polarPaymentId: polarOrderId,
        type: PaymentTransactionType.CHARGE,
        status: PaymentTransactionStatus.SUCCESS,
        amount: order.amount,
        feeAmount: data.fee_amount || 0,
        netAmount: (order.amount || 0) - (data.fee_amount || 0),
        currency: order.currency,
        paymentMethod: data.payment_method || null,
        cardBrand: data.card_brand || null,
        cardLast4: data.card_last4 || null,
        metadata: data,
      });
      await this.transactionRepo.save(transaction);
    }

    this.logger.log(
      `Order ${order.orderNumber} successfully marked as PAID (Amount: ${order.amount} ${order.currency})`,
    );
  }

  /**
   * Webhook handler: Processes subscription updates and renewals
   */
  private async handleSubscriptionUpdated(
    data: Record<string, any>,
  ): Promise<void> {
    const polarSubId = data.id;
    const customerData = data.customer || {};
    const polarCustomerId = customerData.id || data.customer_id;
    const customerEmail = customerData.email || data.customer_email;

    const userId =
      customerData.external_id ||
      data.metadata?.userId ||
      (await this.resolveUserIdByEmail(customerEmail));

    let customer: PaymentCustomerEntity | null = null;
    if (polarCustomerId && customerEmail) {
      customer = await this.syncCustomer(
        polarCustomerId,
        customerEmail,
        userId,
        customerData.name,
      );
    }

    let subscription = await this.subscriptionRepo.findOne({
      where: { polarSubscriptionId: polarSubId },
    });

    const statusMap: Record<string, PaymentSubscriptionStatus> = {
      active: PaymentSubscriptionStatus.ACTIVE,
      canceled: PaymentSubscriptionStatus.CANCELED,
      past_due: PaymentSubscriptionStatus.PAST_DUE,
      incomplete: PaymentSubscriptionStatus.INCOMPLETE,
      trialing: PaymentSubscriptionStatus.TRIALING,
      unpaid: PaymentSubscriptionStatus.UNPAID,
      paused: PaymentSubscriptionStatus.PAUSED,
    };
    const mappedStatus =
      statusMap[data.status] || PaymentSubscriptionStatus.ACTIVE;

    if (!subscription) {
      subscription = this.subscriptionRepo.create({
        polarSubscriptionId: polarSubId,
        polarCustomerId,
        customerId: customer?.id || null,
        userId: userId || null,
        customerEmail: customerEmail || 'unknown@example.com',
        productId: data.product_id || data.product?.id || 'unknown',
        amount: data.amount ?? data.recurring_price_amount ?? null,
        currency: data.currency ?? null,
        recurringInterval: data.recurring_interval ?? null,
        status: mappedStatus,
        currentPeriodStart: data.current_period_start
          ? new Date(data.current_period_start)
          : null,
        currentPeriodEnd: data.current_period_end
          ? new Date(data.current_period_end)
          : null,
        cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
        startedAt: data.started_at ? new Date(data.started_at) : null,
        endedAt: data.ended_at ? new Date(data.ended_at) : null,
        discountId: data.discount_id ?? null,
        customFieldData: data.custom_field_data ?? null,
        metadata: data.metadata || null,
      });
    } else {
      subscription.status = mappedStatus;
      if (data.amount !== undefined) subscription.amount = data.amount;
      if (data.currency !== undefined) subscription.currency = data.currency;
      if (data.recurring_interval !== undefined)
        subscription.recurringInterval = data.recurring_interval;
      if (data.started_at !== undefined)
        subscription.startedAt = data.started_at
          ? new Date(data.started_at)
          : null;
      if (data.ended_at !== undefined)
        subscription.endedAt = data.ended_at ? new Date(data.ended_at) : null;
      if (data.discount_id !== undefined)
        subscription.discountId = data.discount_id;
      if (data.custom_field_data !== undefined)
        subscription.customFieldData = data.custom_field_data;
      if (data.current_period_start) {
        subscription.currentPeriodStart = new Date(data.current_period_start);
      }
      if (data.current_period_end) {
        subscription.currentPeriodEnd = new Date(data.current_period_end);
      }
      subscription.cancelAtPeriodEnd = Boolean(data.cancel_at_period_end);
      if (customer?.id && !subscription.customerId) {
        subscription.customerId = customer.id;
      }
      if (userId && !subscription.userId) {
        subscription.userId = userId;
      }
    }
    await this.subscriptionRepo.save(subscription);

    this.logger.log(
      `Subscription ${polarSubId} updated to status: ${mappedStatus}`,
    );
  }

  /**
   * Webhook handler: Processes subscription cancellations
   */
  private async handleSubscriptionCanceled(
    data: Record<string, any>,
  ): Promise<void> {
    const polarSubId = data.id;
    const subscription = await this.subscriptionRepo.findOne({
      where: { polarSubscriptionId: polarSubId },
    });
    if (subscription) {
      subscription.status = PaymentSubscriptionStatus.CANCELED;
      subscription.cancelAtPeriodEnd = false;
      await this.subscriptionRepo.save(subscription);
      this.logger.log(`Subscription ${polarSubId} marked as CANCELED`);
    }
  }

  /**
   * Webhook handler: Processes order refunds and records ledger refund transaction
   */
  private async handleOrderRefunded(data: Record<string, any>): Promise<void> {
    const polarOrderId = data.order_id || data.id;
    const order = await this.orderRepo.findOne({
      where: { polarOrderId },
    });
    if (!order) return;

    order.status = PaymentOrderStatus.REFUNDED;
    await this.orderRepo.save(order);

    const refundTx = this.transactionRepo.create({
      userId: order.userId || null,
      orderId: order.id,
      polarPaymentId: data.id ? `refund_${data.id}` : null,
      type: PaymentTransactionType.REFUND,
      status: PaymentTransactionStatus.SUCCESS,
      amount: data.amount || order.amount,
      feeAmount: 0,
      netAmount: -(data.amount || order.amount),
      currency: order.currency,
      metadata: data,
    });
    await this.transactionRepo.save(refundTx);

    this.logger.log(`Order ${order.orderNumber} successfully REFUNDED`);
  }

  /**
   * Retrieves orders for a specific user, with safe batch backfill for missing userId
   */
  async getUserOrders(
    userId: string,
    email?: string,
  ): Promise<PaymentOrderResDto[]> {
    const whereConditions: FindOptionsWhere<PaymentOrderEntity>[] = [
      { userId: userId as AutoIncrementID },
    ];
    if (email) {
      whereConditions.push({ customerEmail: email });
    }
    const orders = await this.orderRepo.find({
      where: whereConditions,
      order: { createdAt: 'DESC' },
    });

    if (email) {
      const ordersToBackfill = orders.filter((order) => !order.userId);
      if (ordersToBackfill.length > 0) {
        for (const order of ordersToBackfill) {
          order.userId = userId as AutoIncrementID;
        }
        await this.orderRepo.save(ordersToBackfill).catch((err) => {
          this.logger.warn(
            `Failed to backfill userId for orders: ${err.message}`,
          );
        });
      }
    }

    return plainToInstance(PaymentOrderResDto, orders);
  }

  /**
   * Retrieves subscriptions for a specific user, with safe batch backfill for missing userId
   */
  async getUserSubscriptions(
    userId: string,
    email?: string,
  ): Promise<PaymentSubscriptionResDto[]> {
    const whereConditions: FindOptionsWhere<PaymentSubscriptionEntity>[] = [
      { userId: userId as AutoIncrementID },
    ];
    if (email) {
      whereConditions.push({ customerEmail: email });
    }
    const subscriptions = await this.subscriptionRepo.find({
      where: whereConditions,
      order: { createdAt: 'DESC' },
    });

    if (email) {
      const subsToBackfill = subscriptions.filter((sub) => !sub.userId);
      if (subsToBackfill.length > 0) {
        for (const sub of subsToBackfill) {
          sub.userId = userId as AutoIncrementID;
        }
        await this.subscriptionRepo.save(subsToBackfill).catch((err) => {
          this.logger.warn(
            `Failed to backfill userId for subscriptions: ${err.message}`,
          );
        });
      }
    }

    return plainToInstance(PaymentSubscriptionResDto, subscriptions);
  }

  async getOrderById(id: AutoIncrementID): Promise<PaymentOrderResDto> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Payment order with ID #${id} not found.`);
    }
    return plainToInstance(PaymentOrderResDto, order);
  }

  async getAdminOrders(
    query: PaginateQuery,
  ): Promise<Paginated<PaymentOrderResDto>> {
    const queryBuilder = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'amount', 'status', 'createdAt', 'updatedAt'],
      searchableColumns: ['orderNumber', 'customerEmail', 'polarOrderId'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        userId: [FilterOperator.EQ],
        status: [FilterOperator.EQ, FilterOperator.IN],
        customerEmail: [FilterOperator.ILIKE],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
      },
    });

    return {
      ...result,
      data: plainToInstance(PaymentOrderResDto, result.data),
    } as Paginated<PaymentOrderResDto>;
  }

  async getAdminTransactions(
    query: PaginateQuery,
  ): Promise<Paginated<PaymentTransactionResDto>> {
    const queryBuilder = this.transactionRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.user', 'user');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'amount', 'type', 'status', 'createdAt'],
      searchableColumns: ['polarPaymentId'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        userId: [FilterOperator.EQ],
        type: [FilterOperator.EQ],
        status: [FilterOperator.EQ],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
      },
    });

    return {
      ...result,
      data: plainToInstance(PaymentTransactionResDto, result.data),
    } as Paginated<PaymentTransactionResDto>;
  }

  async getAdminSubscriptions(
    query: PaginateQuery,
  ): Promise<Paginated<PaymentSubscriptionResDto>> {
    const queryBuilder = this.subscriptionRepo
      .createQueryBuilder('sub')
      .leftJoinAndSelect('sub.user', 'user');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'status', 'currentPeriodEnd', 'createdAt'],
      searchableColumns: ['polarSubscriptionId', 'customerEmail'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        userId: [FilterOperator.EQ],
        status: [FilterOperator.EQ, FilterOperator.IN],
        customerEmail: [FilterOperator.ILIKE],
      },
    });

    return {
      ...result,
      data: plainToInstance(PaymentSubscriptionResDto, result.data),
    } as Paginated<PaymentSubscriptionResDto>;
  }

  async cancelSubscription(
    id: AutoIncrementID,
  ): Promise<PaymentSubscriptionResDto> {
    const sub = await this.subscriptionRepo.findOne({ where: { id } });
    if (!sub) {
      throw new NotFoundException(`Subscription #${id} not found.`);
    }

    if (
      this.polarService.isGatewayConfigured() &&
      sub.polarSubscriptionId &&
      !sub.polarSubscriptionId.startsWith('local_')
    ) {
      await this.polarService.cancelSubscription(sub.polarSubscriptionId);
    }

    sub.cancelAtPeriodEnd = true;
    const saved = await this.subscriptionRepo.save(sub);
    return plainToInstance(PaymentSubscriptionResDto, saved);
  }

  async revokeSubscription(
    id: AutoIncrementID,
  ): Promise<PaymentSubscriptionResDto> {
    const sub = await this.subscriptionRepo.findOne({ where: { id } });
    if (!sub) {
      throw new NotFoundException(`Subscription #${id} not found.`);
    }

    if (
      this.polarService.isGatewayConfigured() &&
      sub.polarSubscriptionId &&
      !sub.polarSubscriptionId.startsWith('local_')
    ) {
      await this.polarService.revokeSubscription(sub.polarSubscriptionId);
    }

    sub.status = PaymentSubscriptionStatus.CANCELED;
    sub.endedAt = new Date();
    const saved = await this.subscriptionRepo.save(sub);
    return plainToInstance(PaymentSubscriptionResDto, saved);
  }

  async exportSubscriptions(): Promise<string> {
    if (!this.polarService.isGatewayConfigured()) {
      return 'id,status,customer_email,created_at\n';
    }
    return await this.polarService.exportSubscriptions();
  }

  async getOrderInvoice(id: AutoIncrementID): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order #${id} not found.`);
    }

    if (
      !this.polarService.isGatewayConfigured() ||
      !order.polarOrderId ||
      order.polarOrderId.startsWith('local_')
    ) {
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        invoiceUrl: order.invoiceUrl,
      };
    }

    const invoice = await this.polarService.getOrderInvoice(order.polarOrderId);
    if ((invoice as any)?.url && !order.invoiceUrl) {
      order.invoiceUrl = (invoice as any).url;
      await this.orderRepo.save(order);
    }
    return invoice;
  }

  async getOrderReceipt(id: AutoIncrementID): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order #${id} not found.`);
    }

    if (
      !this.polarService.isGatewayConfigured() ||
      !order.polarOrderId ||
      order.polarOrderId.startsWith('local_')
    ) {
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        receiptUrl: order.receiptUrl,
      };
    }

    return await this.polarService.getOrderReceipt(order.polarOrderId);
  }

  async exportOrders(): Promise<string> {
    if (!this.polarService.isGatewayConfigured()) {
      return 'id,order_number,amount,currency,status,created_at\n';
    }
    return await this.polarService.exportOrders();
  }

  /**
   * Retrieves overall payment and subscription summary for a specific user
   */
  async getUserPaymentSummary(userId: AutoIncrementID) {
    const subscriptions = await this.subscriptionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const orders = await this.orderRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const paidOrders = orders.filter(
      (o) => o.status === PaymentOrderStatus.PAID,
    );
    const totalSpent = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

    return {
      subscriptions: plainToInstance(PaymentSubscriptionResDto, subscriptions),
      recentOrders: plainToInstance(PaymentOrderResDto, orders.slice(0, 10)),
      totalSpent,
      totalOrdersCount: paidOrders.length,
      currency: orders[0]?.currency || 'usd',
    };
  }

  /**
   * Client: Creates a new refund request for an eligible order
   */
  async createRefundRequest(
    userId: AutoIncrementID,
    orderId: AutoIncrementID,
    dto: CreateRefundRequestReqDto,
  ): Promise<PaymentRefundRequestResDto> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order #${orderId} was not found.`);
    }

    if (String(order.userId) !== String(userId)) {
      throw new BadRequestException(
        'You are not authorized to request a refund for this order.',
      );
    }

    if (order.status !== PaymentOrderStatus.PAID) {
      throw new BadRequestException(
        `Order cannot be refunded because its current status is '${order.status}'. Only paid orders can be refunded.`,
      );
    }

    const existingPending = await this.refundRequestRepo.findOne({
      where: {
        orderId,
        status: PaymentRefundRequestStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new ConflictException(
        'A refund request for this order is already pending review.',
      );
    }

    // 14-day policy window check
    const daysSinceOrder =
      (Date.now() - new Date(order.createdAt).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSinceOrder > 14) {
      throw new BadRequestException(
        'Refund requests can only be submitted within 14 days of order purchase.',
      );
    }

    const refundRequest = this.refundRequestRepo.create({
      orderId: order.id,
      userId,
      amount: order.amount,
      currency: order.currency,
      reason: dto.reason,
      customerNote: dto.customerNote,
      status: PaymentRefundRequestStatus.PENDING,
    });

    const saved = await this.refundRequestRepo.save(refundRequest);
    this.logger.log(
      `User #${userId} created refund request #${saved.id} for order ${order.orderNumber}`,
    );

    // Notify admins (in-app notification + email)
    try {
      const amountFormatted = `$${(saved.amount / 100).toFixed(2)}`;
      const portalBaseUrl = this.configService.get(
        'auth.portalResetPasswordUrl',
        { infer: true },
      )
        ? new URL(
            this.configService.getOrThrow('auth.portalResetPasswordUrl', {
              infer: true,
            }),
          ).origin
        : 'http://localhost:5173';
      const portalPaymentsUrl = `${portalBaseUrl}/payments`;

      const { emailRecipients } = await this.notificationService.notifyAdmins({
        type: AdminNotificationType.RefundRequested,
        title: 'New Refund Request',
        message: `Order #${order.orderNumber} (${amountFormatted} ${saved.currency.toUpperCase()}) - ${saved.reason.replace(/_/g, ' ')}`,
        data: {
          requestId: saved.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: saved.amount,
          currency: saved.currency,
          reason: saved.reason,
        },
      });

      for (const admin of emailRecipients) {
        if (admin.email) {
          await this.mailService
            .sendAdminRefundRequestedEmail(admin.email, {
              orderNumber: order.orderNumber,
              customerEmail: order.customerEmail,
              amount: amountFormatted,
              currency: saved.currency.toUpperCase(),
              reason: saved.reason.replace(/_/g, ' '),
              customerNote: saved.customerNote || undefined,
              portalUrl: portalPaymentsUrl,
            })
            .catch((err) => {
              this.logger.warn(
                `Failed to send refund request email to admin ${admin.email}: ${err.message}`,
              );
            });
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to notify admins for refund request #${saved.id}: ${err.message}`,
      );
    }

    return plainToInstance(PaymentRefundRequestResDto, {
      ...saved,
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
    });
  }

  /**
   * Client: Retrieves all refund requests created by a specific user
   */
  async getUserRefundRequests(
    userId: AutoIncrementID,
  ): Promise<PaymentRefundRequestResDto[]> {
    const requests = await this.refundRequestRepo.find({
      where: { userId },
      relations: ['order'],
      order: { createdAt: 'DESC' },
    });

    return requests.map((req) =>
      plainToInstance(PaymentRefundRequestResDto, {
        ...req,
        orderNumber: req.order?.orderNumber,
        customerEmail: req.order?.customerEmail,
      }),
    );
  }

  /**
   * Admin: Retrieves paginated list of all refund requests
   */
  async getAdminRefundRequests(
    query: PaginateQuery,
  ): Promise<Paginated<PaymentRefundRequestResDto>> {
    const queryBuilder = this.refundRequestRepo
      .createQueryBuilder('refund')
      .leftJoinAndSelect('refund.order', 'order')
      .leftJoinAndSelect('refund.user', 'user')
      .leftJoinAndSelect('refund.reviewer', 'reviewer');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'amount', 'status', 'createdAt', 'reviewedAt'],
      searchableColumns: [
        'order.orderNumber',
        'order.customerEmail',
        'reason',
        'customerNote',
        'adminNote',
      ],
      defaultSortBy: [['createdAt', 'DESC']],
      filterableColumns: {
        status: [FilterOperator.EQ, FilterOperator.IN],
        reason: [FilterOperator.EQ, FilterOperator.IN],
        orderId: [FilterOperator.EQ],
        userId: [FilterOperator.EQ],
      },
    });

    return {
      ...result,
      data: result.data.map((item) =>
        plainToInstance(PaymentRefundRequestResDto, {
          ...item,
          orderNumber: item.order?.orderNumber,
          customerEmail: item.order?.customerEmail,
        }),
      ),
    } as Paginated<PaymentRefundRequestResDto>;
  }

  /**
   * Admin: Reviews (Approves or Rejects) a pending refund request
   */
  async reviewRefundRequest(
    adminId: AutoIncrementID,
    requestId: AutoIncrementID,
    dto: ReviewRefundRequestReqDto,
  ): Promise<PaymentRefundRequestResDto> {
    const request = await this.refundRequestRepo.findOne({
      where: { id: requestId },
      relations: ['order'],
    });

    if (!request) {
      throw new NotFoundException(
        `Refund request #${requestId} was not found.`,
      );
    }

    if (request.status !== PaymentRefundRequestStatus.PENDING) {
      throw new BadRequestException(
        `Refund request #${requestId} has already been reviewed (current status: ${request.status}).`,
      );
    }

    if (dto.action === 'reject') {
      request.status = PaymentRefundRequestStatus.REJECTED;
      request.adminNote =
        dto.adminNote || 'Refund request was rejected by admin.';
      request.reviewedBy = adminId;
      request.reviewedAt = new Date();

      const saved = await this.refundRequestRepo.save(request);
      this.logger.log(
        `Admin #${adminId} REJECTED refund request #${requestId} for order ${request.order?.orderNumber}`,
      );

      if (request.order?.customerEmail) {
        try {
          const clientBaseUrl =
            this.configService.get('app.url', { infer: true }) ||
            'http://localhost:3000';
          await this.mailService.sendCustomerRefundReviewedEmail(
            request.order.customerEmail,
            {
              customerEmail: request.order.customerEmail,
              orderNumber: request.order.orderNumber,
              isApproved: false,
              adminNote: request.adminNote,
              clientUrl: `${clientBaseUrl}/profile`,
            },
          );
        } catch (err: any) {
          this.logger.warn(
            `Failed to send refund rejection email to ${request.order.customerEmail}: ${err.message}`,
          );
        }
      }

      return plainToInstance(PaymentRefundRequestResDto, {
        ...saved,
        orderNumber: request.order?.orderNumber,
        customerEmail: request.order?.customerEmail,
      });
    }

    // Action === 'approve'
    const order = request.order;
    if (!order) {
      throw new BadRequestException('Associated order could not be loaded.');
    }

    const refundAmount = dto.amount || request.amount;
    let polarRefundId: string | null = null;

    if (order.polarOrderId) {
      const gateway = this.gatewayFactory.getProvider('polar');
      if (gateway.createRefund) {
        try {
          const refundResult = await gateway.createRefund({
            orderId: order.polarOrderId,
            amount: refundAmount,
            reason: request.reason,
            comment:
              dto.adminNote ||
              request.customerNote ||
              'Admin approved refund request',
          });
          polarRefundId = refundResult.refundId;
        } catch (err: any) {
          this.logger.error(
            `Polar refund execution failed: ${err.message}`,
            err.stack,
          );
          throw new BadRequestException(
            `Payment gateway refund failed: ${err.message || 'Unknown error'}`,
          );
        }
      }
    }

    // Update request
    request.status = PaymentRefundRequestStatus.APPROVED;
    request.adminNote = dto.adminNote || 'Refund request approved.';
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    request.polarRefundId = polarRefundId;
    const savedRequest = await this.refundRequestRepo.save(request);

    // Update order status
    order.status = PaymentOrderStatus.REFUNDED;
    await this.orderRepo.save(order);

    // Record ledger transaction
    const refundTx = this.transactionRepo.create({
      userId: order.userId || null,
      orderId: order.id,
      polarPaymentId: polarRefundId
        ? `refund_${polarRefundId}`
        : `refund_req_${request.id}`,
      type: PaymentTransactionType.REFUND,
      status: PaymentTransactionStatus.SUCCESS,
      amount: refundAmount,
      feeAmount: 0,
      netAmount: -refundAmount,
      currency: order.currency,
      metadata: {
        refundRequestId: request.id,
        reason: request.reason,
        adminNote: dto.adminNote,
        reviewedBy: adminId,
      },
    });
    await this.transactionRepo.save(refundTx);

    // Cancel related subscription if exists
    if (order.userId) {
      const activeSubscription = await this.subscriptionRepo.findOne({
        where: {
          userId: order.userId,
          status: PaymentSubscriptionStatus.ACTIVE,
        },
      });
      if (activeSubscription) {
        activeSubscription.status = PaymentSubscriptionStatus.CANCELED;
        await this.subscriptionRepo.save(activeSubscription);
        this.logger.log(
          `Canceled subscription #${activeSubscription.id} for user #${order.userId} due to refund`,
        );
      }
    }

    this.logger.log(
      `Admin #${adminId} APPROVED refund request #${requestId} for order ${order.orderNumber}`,
    );

    if (order.customerEmail) {
      try {
        const clientBaseUrl =
          this.configService.get('app.url', { infer: true }) ||
          'http://localhost:3000';
        const refundAmountFormatted = `$${(refundAmount / 100).toFixed(2)}`;
        await this.mailService.sendCustomerRefundReviewedEmail(
          order.customerEmail,
          {
            customerEmail: order.customerEmail,
            orderNumber: order.orderNumber,
            isApproved: true,
            amount: refundAmountFormatted,
            currency: request.currency.toUpperCase(),
            adminNote: request.adminNote || undefined,
            clientUrl: `${clientBaseUrl}/profile`,
          },
        );
      } catch (err: any) {
        this.logger.warn(
          `Failed to send refund approval email to ${order.customerEmail}: ${err.message}`,
        );
      }
    }

    return plainToInstance(PaymentRefundRequestResDto, {
      ...savedRequest,
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
    });
  }

  /**
   * Admin: Direct refund of an order without prior customer request
   */
  async directRefundOrder(
    adminId: AutoIncrementID,
    orderId: AutoIncrementID,
    dto: DirectRefundReqDto,
  ): Promise<PaymentOrderResDto> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order #${orderId} was not found.`);
    }

    if (order.status !== PaymentOrderStatus.PAID) {
      throw new BadRequestException(
        `Cannot refund order #${orderId} with status '${order.status}'. Only paid orders can be refunded.`,
      );
    }

    const refundAmount = dto.amount || order.amount;
    let polarRefundId: string | null = null;

    if (order.polarOrderId) {
      const gateway = this.gatewayFactory.getProvider('polar');
      if (gateway.createRefund) {
        try {
          const refundResult = await gateway.createRefund({
            orderId: order.polarOrderId,
            amount: refundAmount,
            reason: dto.reason,
            comment: dto.comment || 'Direct refund initiated by admin',
          });
          polarRefundId = refundResult.refundId;
        } catch (err: any) {
          this.logger.error(
            `Polar direct refund failed: ${err.message}`,
            err.stack,
          );
          throw new BadRequestException(
            `Payment gateway refund failed: ${err.message || 'Unknown error'}`,
          );
        }
      }
    }

    order.status = PaymentOrderStatus.REFUNDED;
    const savedOrder = await this.orderRepo.save(order);

    // Record ledger transaction
    const refundTx = this.transactionRepo.create({
      userId: order.userId || null,
      orderId: order.id,
      polarPaymentId: polarRefundId
        ? `refund_${polarRefundId}`
        : `direct_refund_${Date.now()}`,
      type: PaymentTransactionType.REFUND,
      status: PaymentTransactionStatus.SUCCESS,
      amount: refundAmount,
      feeAmount: 0,
      netAmount: -refundAmount,
      currency: order.currency,
      metadata: {
        directRefund: true,
        reason: dto.reason,
        comment: dto.comment,
        refundedBy: adminId,
      },
    });
    await this.transactionRepo.save(refundTx);

    // Save corresponding refund request record for audit trail
    const auditRecord = this.refundRequestRepo.create({
      orderId: order.id,
      userId: order.userId || null,
      amount: refundAmount,
      currency: order.currency,
      reason: dto.reason,
      customerNote: 'Direct refund initiated by admin',
      status: PaymentRefundRequestStatus.APPROVED,
      adminNote: dto.comment,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      polarRefundId,
    });
    await this.refundRequestRepo.save(auditRecord);

    // Cancel related subscription if exists
    if (order.userId) {
      const activeSubscription = await this.subscriptionRepo.findOne({
        where: {
          userId: order.userId,
          status: PaymentSubscriptionStatus.ACTIVE,
        },
      });
      if (activeSubscription) {
        activeSubscription.status = PaymentSubscriptionStatus.CANCELED;
        await this.subscriptionRepo.save(activeSubscription);
      }
    }

    this.logger.log(
      `Admin #${adminId} directly refunded order ${order.orderNumber} for ${refundAmount} ${order.currency}`,
    );

    if (order.customerEmail) {
      try {
        const clientBaseUrl =
          this.configService.get('app.url', { infer: true }) ||
          'http://localhost:3000';
        const refundAmountFormatted = `$${(refundAmount / 100).toFixed(2)}`;
        await this.mailService.sendCustomerRefundReviewedEmail(
          order.customerEmail,
          {
            customerEmail: order.customerEmail,
            orderNumber: order.orderNumber,
            isApproved: true,
            amount: refundAmountFormatted,
            currency: order.currency.toUpperCase(),
            adminNote: dto.comment,
            clientUrl: `${clientBaseUrl}/profile`,
          },
        );
      } catch (err: any) {
        this.logger.warn(
          `Failed to send direct refund email to ${order.customerEmail}: ${err.message}`,
        );
      }
    }

    return plainToInstance(PaymentOrderResDto, savedOrder);
  }
}
