import { AutoIncrementID } from '@/common/types/common.type';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import * as crypto from 'crypto';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { CreateCheckoutReqDto } from '../dto/create-checkout.req.dto';
import { CreateCheckoutResDto } from '../dto/create-checkout.res.dto';
import { CreateRefundRequestReqDto } from '../dto/create-refund-request.req.dto';
import { CustomerPortalReqDto } from '../dto/customer-portal.req.dto';
import { CustomerPortalResDto } from '../dto/customer-portal.res.dto';
import { DirectRefundReqDto } from '../dto/direct-refund.req.dto';
import { PaymentOrderResDto } from '../dto/payment-order.res.dto';
import { PaymentRefundRequestResDto } from '../dto/payment-refund-request.res.dto';
import { PaymentSubscriptionResDto } from '../dto/payment-subscription.res.dto';
import { ReviewRefundRequestReqDto } from '../dto/review-refund-request.req.dto';
import {
  PaymentOrderStatus,
  PolarOrderEntity,
} from '../entities/polar-order.entity';
import {
  PolarRefundRequestEntity,
  PolarRefundRequestStatus,
} from '../entities/polar-refund-request.entity';
import {
  PolarSubscriptionEntity,
  PolarSubscriptionStatus,
} from '../entities/polar-subscription.entity';
import {
  PaymentWebhookStatus,
  PolarWebhookEventEntity,
} from '../entities/polar-webhook-event.entity';
import { PolarService } from './polar.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(PolarOrderEntity)
    private readonly orderRepo: Repository<PolarOrderEntity>,
    @InjectRepository(PolarSubscriptionEntity)
    private readonly subscriptionRepo: Repository<PolarSubscriptionEntity>,
    @InjectRepository(PolarWebhookEventEntity)
    private readonly webhookEventRepo: Repository<PolarWebhookEventEntity>,
    @InjectRepository(PolarRefundRequestEntity)
    private readonly refundRequestRepo: Repository<PolarRefundRequestEntity>,
    private readonly polarService: PolarService,
  ) {}

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `ORD-${timestamp}-${randomHex}`;
  }

  /**
   * Helper: Resolves internal user ID by email lookup
   */
  private async resolveUserIdByEmail(
    email?: string | null,
  ): Promise<AutoIncrementID | null> {
    if (!email || !this.orderRepo?.manager?.query) return null;
    try {
      const user = await this.orderRepo.manager.query(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [email],
      );
      return user?.[0]?.id ? (user[0].id as AutoIncrementID) : null;
    } catch {
      return null;
    }
  }

  /**
   * Creates a Polar checkout session and registers a pending order
   */
  async createCheckout(
    dto: CreateCheckoutReqDto,
    currentUser?: { id?: string | number; email?: string; fullName?: string },
  ): Promise<CreateCheckoutResDto> {
    const orderNumber = this.generateOrderNumber();
    const userId = currentUser?.id ? (currentUser.id as AutoIncrementID) : null;
    const customerEmail =
      dto.customerEmail || currentUser?.email || 'unknown@example.com';
    const customerName = dto.customerName || currentUser?.fullName || null;

    // 1. Create a pending order record
    const order = this.orderRepo.create({
      orderNumber,
      userId,
      customerEmail,
      customerName,
      productId: dto.productId,
      amount: 0,
      currency: 'usd',
      status: PaymentOrderStatus.PENDING,
      metadata: {
        ...dto.metadata,
        orderNumber,
      },
    });
    await this.orderRepo.save(order);

    // 2. Generate Polar Checkout Session
    const session = await this.polarService.createCheckoutSession({
      productId: dto.productId,
      successUrl: dto.successUrl,
      customerEmail:
        customerEmail !== 'unknown@example.com' ? customerEmail : undefined,
      customerName: customerName || undefined,
      externalCustomerId: userId ? String(userId) : undefined,
      metadata: {
        ...dto.metadata,
        orderNumber,
        localOrderId: String(order.id),
      },
    });

    // 3. Update checkout reference on pending order
    if (session.id) {
      order.polarCheckoutId = session.id;
      if (session.amount) order.amount = session.amount;
      if (session.currency) order.currency = session.currency;
      await this.orderRepo.save(order);
    }

    return {
      checkoutUrl: session.url,
      checkoutId: session.id,
      orderNumber,
      amount: session.amount ?? undefined,
      currency: session.currency ?? undefined,
    };
  }

  /**
   * Generates a Customer Portal URL for the user
   */
  async createCustomerPortalSession(
    dto: CustomerPortalReqDto,
    currentUser?: { id?: string | number; email?: string },
  ): Promise<CustomerPortalResDto> {
    const externalCustomerId = currentUser?.id
      ? String(currentUser.id)
      : undefined;
    const session = await this.polarService.createCustomerSession({
      customerId: dto.customerId,
      externalCustomerId,
    });

    return {
      portalUrl: session.customerPortalUrl,
    };
  }

  /**
   * Handles incoming Polar webhook events idempotently
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

    this.logger.log(`Processing Polar webhook: ${eventType} (${eventId})`);

    // Idempotency check
    const existing = await this.webhookEventRepo.findOne({
      where: { eventId },
    });
    if (existing && existing.status === PaymentWebhookStatus.PROCESSED) {
      this.logger.log(`Webhook ${eventId} already processed. Skipping.`);
      return;
    }

    const webhookEvent =
      existing ||
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
        case 'order.updated':
          await this.syncOrderFromPolar(data);
          break;

        case 'subscription.created':
        case 'subscription.active':
        case 'subscription.updated':
        case 'subscription.uncanceled':
        case 'subscription.resumed':
          await this.syncSubscriptionFromPolar(
            data,
            PolarSubscriptionStatus.ACTIVE,
          );
          break;

        case 'subscription.canceled':
        case 'subscription.revoked':
        case 'subscription.paused':
        case 'subscription.past_due':
          await this.syncSubscriptionFromPolar(
            data,
            PolarSubscriptionStatus.CANCELED,
          );
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
        `Error processing webhook ${eventId}: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  private async syncOrderFromPolar(data: Record<string, any>): Promise<void> {
    const polarOrderId = data.id as string;
    const polarCheckoutId = (data.checkout_id || data.checkoutId) as string;
    const orderNumber = data.metadata?.orderNumber || data.order_number;
    const customerEmail =
      data.customer?.email || data.customer_email || data.user_email;
    const customerName = data.customer?.name || data.customer_name;
    const externalCustomerId =
      data.customer?.external_id || data.metadata?.userId;
    const productId = data.product_id || data.product?.id;
    const productTitle = data.product?.name || data.product_title;
    const amount =
      typeof data.amount === 'number' ? data.amount : data.total_amount || 0;
    const currency = data.currency || 'usd';
    const invoiceUrl = data.invoice_url || data.invoiceUrl;
    const receiptUrl = data.receipt_url || data.receiptUrl;

    let userId: AutoIncrementID | null = null;
    if (externalCustomerId) {
      userId = String(externalCustomerId) as AutoIncrementID;
    } else if (customerEmail) {
      userId = await this.resolveUserIdByEmail(customerEmail);
    }

    let order =
      (orderNumber
        ? await this.orderRepo.findOne({ where: { orderNumber } })
        : null) ||
      (polarOrderId
        ? await this.orderRepo.findOne({ where: { polarOrderId } })
        : null) ||
      (polarCheckoutId
        ? await this.orderRepo.findOne({ where: { polarCheckoutId } })
        : null);

    if (!order) {
      order = this.orderRepo.create({
        orderNumber: orderNumber || this.generateOrderNumber(),
        customerEmail: customerEmail || 'unknown@example.com',
        productId: productId || 'unknown',
        amount,
        currency,
        status: PaymentOrderStatus.PAID,
      });
    }

    order.polarOrderId = polarOrderId || order.polarOrderId;
    order.polarCheckoutId = polarCheckoutId || order.polarCheckoutId;
    order.status = PaymentOrderStatus.PAID;
    if (userId) order.userId = userId;
    if (customerEmail) order.customerEmail = customerEmail;
    if (customerName) order.customerName = customerName;
    if (productTitle) order.productTitle = productTitle;
    if (amount) order.amount = amount;
    if (currency) order.currency = currency;
    if (invoiceUrl) order.invoiceUrl = invoiceUrl;
    if (receiptUrl) order.receiptUrl = receiptUrl;

    await this.orderRepo.save(order);
    this.logger.log(
      `Synced order: ${order.orderNumber} (Status: ${order.status})`,
    );
  }

  private async syncSubscriptionFromPolar(
    data: Record<string, any>,
    fallbackStatus: PolarSubscriptionStatus,
  ): Promise<void> {
    const polarSubscriptionId = data.id as string;
    if (!polarSubscriptionId) return;

    const polarCustomerId = data.customer_id || data.customer?.id;
    const customerEmail = data.customer?.email || data.customer_email;
    const externalCustomerId =
      data.customer?.external_id || data.metadata?.userId;
    const productId = data.product_id || data.product?.id;
    const amount = typeof data.amount === 'number' ? data.amount : undefined;
    const currency = data.currency || 'usd';
    const recurringInterval =
      data.recurring_interval || data.price?.recurring_interval;
    const cancelAtPeriodEnd = !!(data.cancel_at_period_end ?? false);
    const currentPeriodStart = data.current_period_start
      ? new Date(data.current_period_start)
      : null;
    const currentPeriodEnd = data.current_period_end
      ? new Date(data.current_period_end)
      : null;
    const startedAt = data.started_at ? new Date(data.started_at) : null;
    const endedAt = data.ended_at ? new Date(data.ended_at) : null;

    let userId: AutoIncrementID | null = null;
    if (externalCustomerId) {
      userId = String(externalCustomerId) as AutoIncrementID;
    } else if (customerEmail) {
      userId = await this.resolveUserIdByEmail(customerEmail);
    }

    let status = fallbackStatus;
    if (data.status === 'active') status = PolarSubscriptionStatus.ACTIVE;
    if (data.status === 'canceled') status = PolarSubscriptionStatus.CANCELED;
    if (data.status === 'past_due') status = PolarSubscriptionStatus.PAST_DUE;
    if (data.status === 'trialing') status = PolarSubscriptionStatus.TRIALING;

    let sub = await this.subscriptionRepo.findOne({
      where: { polarSubscriptionId },
    });

    if (!sub) {
      sub = this.subscriptionRepo.create({
        polarSubscriptionId,
        productId: productId || 'unknown',
        status,
      });
    }

    if (userId) sub.userId = userId;
    if (polarCustomerId) sub.polarCustomerId = polarCustomerId;
    if (customerEmail) sub.customerEmail = customerEmail;
    if (productId) sub.productId = productId;
    if (amount !== undefined) sub.amount = amount;
    if (currency) sub.currency = currency;
    if (recurringInterval) sub.recurringInterval = recurringInterval;
    sub.status = status;
    sub.cancelAtPeriodEnd = cancelAtPeriodEnd;
    if (currentPeriodStart) sub.currentPeriodStart = currentPeriodStart;
    if (currentPeriodEnd) sub.currentPeriodEnd = currentPeriodEnd;
    if (startedAt) sub.startedAt = startedAt;
    if (endedAt) sub.endedAt = endedAt;

    await this.subscriptionRepo.save(sub);
    this.logger.log(
      `Synced subscription: ${polarSubscriptionId} (Status: ${sub.status})`,
    );
  }

  private async handleOrderRefunded(data: Record<string, any>): Promise<void> {
    const polarOrderId = data.order_id || data.id;
    if (!polarOrderId) return;

    const order = await this.orderRepo.findOne({ where: { polarOrderId } });
    if (order) {
      order.status = PaymentOrderStatus.REFUNDED;
      await this.orderRepo.save(order);
      this.logger.log(`Marked order ${order.orderNumber} as REFUNDED`);
    }
  }

  /**
   * User Queries
   */
  async getUserOrders(
    userId: string,
    email?: string,
  ): Promise<PaymentOrderResDto[]> {
    const qb = this.orderRepo.createQueryBuilder('order');
    if (userId && !isNaN(Number(userId))) {
      qb.where('order.user_id = :userId', { userId: Number(userId) });
      if (email) {
        qb.orWhere('order.customer_email = :email', { email });
      }
    } else if (email) {
      qb.where('order.customer_email = :email', { email });
    }
    qb.orderBy('order.createdAt', 'DESC');
    return (await qb.getMany()) as any;
  }

  async getUserSubscriptions(
    userId: string,
    email?: string,
  ): Promise<PaymentSubscriptionResDto[]> {
    const qb = this.subscriptionRepo.createQueryBuilder('sub');
    if (userId && !isNaN(Number(userId))) {
      qb.where('sub.user_id = :userId', { userId: Number(userId) });
      if (email) {
        qb.orWhere('sub.customer_email = :email', { email });
      }
    } else if (email) {
      qb.where('sub.customer_email = :email', { email });
    }
    qb.orderBy('sub.createdAt', 'DESC');
    return (await qb.getMany()) as any;
  }

  /**
   * Admin Queries
   */
  async getAdminOrders(query: PaginateQuery) {
    return await paginate(query, this.orderRepo, {
      sortableColumns: ['id', 'orderNumber', 'amount', 'status', 'createdAt'],
      defaultSortBy: [['createdAt', 'DESC']],
      searchableColumns: [
        'orderNumber',
        'customerEmail',
        'customerName',
        'polarOrderId',
      ],
      filterableColumns: {
        status: [FilterOperator.EQ, FilterOperator.IN],
        customerEmail: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });
  }

  async getAdminSubscriptions(query: PaginateQuery) {
    return await paginate(query, this.subscriptionRepo, {
      sortableColumns: ['id', 'status', 'currentPeriodEnd', 'createdAt'],
      defaultSortBy: [['createdAt', 'DESC']],
      searchableColumns: ['polarSubscriptionId', 'customerEmail', 'productId'],
      filterableColumns: {
        status: [FilterOperator.EQ, FilterOperator.IN],
        customerEmail: [FilterOperator.EQ, FilterOperator.ILIKE],
      },
    });
  }

  // ==========================================
  // REFUND REQUESTS
  // ==========================================

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
        status: PolarRefundRequestStatus.PENDING,
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
      status: PolarRefundRequestStatus.PENDING,
    });

    const saved = await this.refundRequestRepo.save(refundRequest);
    this.logger.log(
      `User #${userId} created refund request #${saved.id} for order ${order.orderNumber}`,
    );

    return plainToInstance(PaymentRefundRequestResDto, {
      ...saved,
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
    });
  }

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

    if (request.status !== PolarRefundRequestStatus.PENDING) {
      throw new BadRequestException(
        `Refund request #${requestId} has already been reviewed (current status: ${request.status}).`,
      );
    }

    if (dto.action === 'reject') {
      request.status = PolarRefundRequestStatus.REJECTED;
      request.adminNote =
        dto.adminNote || 'Refund request was rejected by admin.';
      request.reviewedBy = adminId;
      request.reviewedAt = new Date();

      const saved = await this.refundRequestRepo.save(request);
      this.logger.log(
        `Admin #${adminId} REJECTED refund request #${requestId} for order ${request.order?.orderNumber}`,
      );

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
      try {
        const refundResult: any = await this.polarService.createRefund({
          orderId: order.polarOrderId,
          amount: refundAmount,
          reason: request.reason,
          comment:
            dto.adminNote ||
            request.customerNote ||
            'Admin approved refund request',
          revokeBenefits: true,
        });
        polarRefundId = refundResult?.id || null;
      } catch (err: any) {
        this.logger.error(
          `Polar refund execution failed: ${err.message}`,
          err.stack,
        );
        throw new BadRequestException(
          `Polar payment gateway refund failed: ${err.message || 'Unknown error'}`,
        );
      }
    }

    request.status = PolarRefundRequestStatus.APPROVED;
    request.adminNote = dto.adminNote || 'Refund request approved.';
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    request.polarRefundId = polarRefundId;
    const savedRequest = await this.refundRequestRepo.save(request);

    order.status = PaymentOrderStatus.REFUNDED;
    await this.orderRepo.save(order);

    return plainToInstance(PaymentRefundRequestResDto, {
      ...savedRequest,
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
    });
  }

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
        `Order #${orderId} cannot be refunded because its status is '${order.status}'.`,
      );
    }

    const refundAmount = dto.amount || order.amount;
    let polarRefundId: string | null = null;

    if (order.polarOrderId) {
      try {
        const refundResult: any = await this.polarService.createRefund({
          orderId: order.polarOrderId,
          amount: refundAmount,
          reason: dto.reason,
          comment: dto.comment || 'Direct refund by administrator',
          revokeBenefits: true,
        });
        polarRefundId = refundResult?.id || null;
      } catch (err: any) {
        this.logger.error(
          `Direct polar refund failed: ${err.message}`,
          err.stack,
        );
        throw new BadRequestException(
          `Payment gateway direct refund failed: ${err.message || 'Unknown error'}`,
        );
      }
    }

    order.status = PaymentOrderStatus.REFUNDED;
    if (polarRefundId) {
      order.metadata = {
        ...(order.metadata || {}),
        polarRefundId,
        refundedByAdminId: adminId,
        refundedAt: new Date().toISOString(),
      };
    }
    const saved = await this.orderRepo.save(order);
    return saved as any;
  }
}
