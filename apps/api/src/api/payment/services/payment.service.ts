import { AutoIncrementID } from '@/common/types/common.type';
import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import crypto from 'crypto';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { CreateCheckoutReqDto } from '../dto/create-checkout.req.dto';
import { CreateCheckoutResDto } from '../dto/create-checkout.res.dto';
import { CustomerPortalReqDto } from '../dto/customer-portal.req.dto';
import { CustomerPortalResDto } from '../dto/customer-portal.res.dto';
import { PaymentOrderResDto } from '../dto/payment-order.res.dto';
import { PaymentSubscriptionResDto } from '../dto/payment-subscription.res.dto';
import { PaymentTransactionResDto } from '../dto/payment-transaction.res.dto';
import { PaymentCustomerEntity } from '../entities/payment-customer.entity';
import {
  PaymentOrderEntity,
  PaymentOrderStatus,
} from '../entities/payment-order.entity';
import {
  PaymentSubscriptionEntity,
  PaymentSubscriptionStatus,
} from '../entities/payment-subscription.entity';
import {
  PaymentTransactionEntity,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from '../entities/payment-transaction.entity';
import {
  PaymentWebhookEventEntity,
  PaymentWebhookStatus,
} from '../entities/payment-webhook-event.entity';
import { PolarService } from './polar.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(PaymentCustomerEntity)
    private readonly customerRepo: Repository<PaymentCustomerEntity>,
    @InjectRepository(PaymentOrderEntity)
    private readonly orderRepo: Repository<PaymentOrderEntity>,
    @InjectRepository(PaymentTransactionEntity)
    private readonly transactionRepo: Repository<PaymentTransactionEntity>,
    @InjectRepository(PaymentSubscriptionEntity)
    private readonly subscriptionRepo: Repository<PaymentSubscriptionEntity>,
    @InjectRepository(PaymentWebhookEventEntity)
    private readonly webhookEventRepo: Repository<PaymentWebhookEventEntity>,
    private readonly polarService: PolarService,
  ) {}

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `ORD-${timestamp}-${randomHex}`;
  }

  async createCheckout(
    dto: CreateCheckoutReqDto,
    currentUser?: { id?: string | number; email?: string; fullName?: string },
  ): Promise<CreateCheckoutResDto> {
    const userId =
      dto.userId || (currentUser?.id ? String(currentUser.id) : undefined);
    const customerEmail = dto.customerEmail || currentUser?.email;
    const customerName = dto.customerName || currentUser?.fullName;

    const orderNumber = this.generateOrderNumber();

    // Find or create local customer profile
    let customer: PaymentCustomerEntity | null = null;
    if (userId) {
      customer = await this.customerRepo.findOne({ where: { userId } });
    }
    if (!customer && customerEmail) {
      customer = await this.customerRepo.findOne({
        where: { email: customerEmail },
      });
    }

    // Create pending order record in database
    const order = this.orderRepo.create({
      orderNumber,
      userId: userId || null,
      customerId: customer?.id || null,
      customerEmail: customerEmail || customer?.email || 'unknown@example.com',
      customerName: customerName || customer?.name || null,
      productId: dto.productId,
      amount: 0, // Will be updated on webhook with actual charged amount from Polar
      currency: 'usd',
      status: PaymentOrderStatus.PENDING,
      metadata: {
        ...dto.metadata,
        orderNumber,
      },
    });
    await this.orderRepo.save(order);

    // Call Polar API to generate checkout session
    try {
      const checkout = await this.polarService.createCheckoutSession({
        productId: dto.productId,
        successUrl: dto.successUrl,
        customerEmail: customerEmail || undefined,
        customerName: customerName || undefined,
        externalCustomerId: userId,
        metadata: {
          ...dto.metadata,
          orderNumber,
          localOrderId: String(order.id),
        },
      });

      // Update order with Polar Checkout Session ID
      order.polarCheckoutId = checkout.id;
      if (checkout.amount) {
        order.amount = checkout.amount;
      }
      if (checkout.currency) {
        order.currency = checkout.currency;
      }
      await this.orderRepo.save(order);

      return {
        checkoutUrl: checkout.url,
        url: checkout.url,
        checkoutId: checkout.id,
        orderNumber,
      };
    } catch (error: any) {
      order.status = PaymentOrderStatus.FAILED;
      await this.orderRepo.save(order);
      this.logger.error(
        `Failed to create Polar checkout: ${error.message}`,
        error.stack,
      );

      // Re-throw NestJS HTTP exceptions (e.g. ServiceUnavailableException from ensureConfigured)
      if (error instanceof HttpException) {
        throw error;
      }

      // Wrap raw Polar SDK / network errors into a user-friendly BadRequestException
      throw new BadRequestException(
        'Failed to create checkout session. Please verify your Polar product configuration and try again.',
      );
    }
  }

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
      let customer: PaymentCustomerEntity | null = null;
      if (userId) {
        customer = await this.customerRepo.findOne({ where: { userId } });
      }
      if (!customer && email) {
        customer = await this.customerRepo.findOne({ where: { email } });
      }
      if (customer) {
        customerId = customer.polarCustomerId;
      }
    }

    if (!customerId && !userId) {
      throw new BadRequestException(
        'Could not find a valid Polar customer profile. Provide a customerId or customerEmail with active transactions.',
      );
    }

    try {
      const session = await this.polarService.createCustomerSession({
        customerId: customerId || undefined,
        externalCustomerId: !customerId ? userId : undefined,
      });

      return {
        portalUrl: session.customerPortalUrl,
        url: session.customerPortalUrl,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to create customer portal session: ${error.message}`,
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

    // Save or update incoming event
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
        case 'order.created':
        case 'order.paid':
          await this.handleOrderPaid(data);
          break;

        case 'subscription.created':
        case 'subscription.active':
        case 'subscription.updated':
          await this.handleSubscriptionUpdated(data);
          break;

        case 'subscription.canceled':
        case 'subscription.revoked':
          await this.handleSubscriptionCanceled(data);
          break;

        case 'order.refunded':
        case 'refund.created':
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

  private async syncCustomer(
    polarCustomerId: string,
    email: string,
    userId?: string | null,
    name?: string | null,
  ): Promise<PaymentCustomerEntity> {
    let customer = await this.customerRepo.findOne({
      where: { polarCustomerId },
    });
    if (!customer) {
      customer = this.customerRepo.create({
        polarCustomerId,
        email,
        userId: userId || null,
        name: name || null,
      });
    } else {
      if (userId && !customer.userId) {
        customer.userId = userId;
      }
      if (email && customer.email !== email) {
        customer.email = email;
      }
      if (name && !customer.name) {
        customer.name = name;
      }
    }
    return await this.customerRepo.save(customer);
  }

  private async handleOrderPaid(data: Record<string, any>): Promise<void> {
    const polarOrderId = data.id;
    const checkoutId = data.checkout_id;
    const customerData = data.customer || {};
    const polarCustomerId = customerData.id || data.customer_id;
    const customerEmail = customerData.email || data.customer_email;
    const customerName = customerData.name || data.customer_name;
    const userId = customerData.external_id || data.metadata?.userId || null;
    const orderNumber = data.metadata?.orderNumber;

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
      // If order was created directly via checkout link or external flow, create record
      order = this.orderRepo.create({
        orderNumber: orderNumber || this.generateOrderNumber(),
        polarOrderId,
        polarCheckoutId: checkoutId || null,
        userId: userId || null,
        customerId: customer?.id || null,
        customerEmail: customerEmail || 'unknown@example.com',
        customerName: customerName || null,
        productId: data.product_id || data.product?.id || 'unknown',
        productTitle: data.product?.name || null,
        amount: data.amount || 0,
        currency: data.currency || 'usd',
        status: PaymentOrderStatus.PAID,
        metadata: data.metadata || null,
      });
    } else {
      order.status = PaymentOrderStatus.PAID;
      order.polarOrderId = polarOrderId;
      if (data.amount) order.amount = data.amount;
      if (data.currency) order.currency = data.currency;
      if (customer?.id && !order.customerId) order.customerId = customer.id;
      if (data.product?.name) order.productTitle = data.product.name;
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
  }

  private async handleSubscriptionUpdated(
    data: Record<string, any>,
  ): Promise<void> {
    const polarSubId = data.id;
    const customerData = data.customer || {};
    const polarCustomerId = customerData.id || data.customer_id;
    const customerEmail = customerData.email || data.customer_email;
    const userId = customerData.external_id || data.metadata?.userId || null;

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
        status: mappedStatus,
        currentPeriodStart: data.current_period_start
          ? new Date(data.current_period_start)
          : null,
        currentPeriodEnd: data.current_period_end
          ? new Date(data.current_period_end)
          : null,
        cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
        metadata: data.metadata || null,
      });
    } else {
      subscription.status = mappedStatus;
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
    }
    await this.subscriptionRepo.save(subscription);
  }

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
    }
  }

  private async handleOrderRefunded(data: Record<string, any>): Promise<void> {
    const polarOrderId = data.order_id || data.id;
    const order = await this.orderRepo.findOne({
      where: { polarOrderId },
    });
    if (order) {
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
    }
  }

  async getUserOrders(userId: string): Promise<PaymentOrderResDto[]> {
    const orders = await this.orderRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return plainToInstance(PaymentOrderResDto, orders);
  }

  async getUserSubscriptions(
    userId: string,
  ): Promise<PaymentSubscriptionResDto[]> {
    const subscriptions = await this.subscriptionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
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
    const queryBuilder = this.orderRepo.createQueryBuilder('order');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'amount', 'status', 'createdAt', 'updatedAt'],
      searchableColumns: ['orderNumber', 'customerEmail', 'polarOrderId'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
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
    const queryBuilder = this.transactionRepo.createQueryBuilder('tx');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'amount', 'type', 'status', 'createdAt'],
      searchableColumns: ['polarPaymentId', 'userId'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
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
    const queryBuilder = this.subscriptionRepo.createQueryBuilder('sub');

    const result = await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'status', 'currentPeriodEnd', 'createdAt'],
      searchableColumns: ['polarSubscriptionId', 'customerEmail', 'userId'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        status: [FilterOperator.EQ, FilterOperator.IN],
        customerEmail: [FilterOperator.ILIKE],
      },
    });

    return {
      ...result,
      data: plainToInstance(PaymentSubscriptionResDto, result.data),
    } as Paginated<PaymentSubscriptionResDto>;
  }
}
