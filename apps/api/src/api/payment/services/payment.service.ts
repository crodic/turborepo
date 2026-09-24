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
import { FindOptionsWhere, Repository } from 'typeorm';
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
import { PaymentGatewayFactory } from '../factories/payment-gateway.factory';
import { ProductService } from './product.service';

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
    private readonly gatewayFactory: PaymentGatewayFactory,
    private readonly productService: ProductService,
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

  /**
   * Helper: Synchronizes Polar customer record with local database
   */
  private async syncCustomer(
    polarCustomerId: string,
    email: string,
    userId?: AutoIncrementID | string | null,
    name?: string | null,
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
      });
    } else {
      if (parsedUserId && !customer.userId) customer.userId = parsedUserId;
      if (email && customer.email !== email) customer.email = email;
      if (name && !customer.name) customer.name = name;
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
}
