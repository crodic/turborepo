import { NotificationService } from '@/api/notification/notification.service';
import { MailService } from '@/mail/mail.service';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentCustomerEntity } from '../entities/polar-customer.entity';
import {
  PaymentOrderEntity,
  PaymentOrderStatus,
} from '../entities/polar-order.entity';
import { PaymentRefundRequestEntity } from '../entities/polar-refund-request.entity';
import {
  PaymentSubscriptionEntity,
  PaymentSubscriptionStatus,
} from '../entities/polar-subscription.entity';
import {
  PaymentTransactionEntity,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from '../entities/polar-transaction.entity';
import {
  PaymentWebhookEventEntity,
  PaymentWebhookStatus,
} from '../entities/polar-webhook-event.entity';
import { PaymentGatewayFactory } from '../factories/payment-gateway.factory';
import { CustomFieldService } from './custom-field.service';
import { DiscountService } from './discount.service';
import { PaymentService } from './payment.service';
import { PolarService } from './polar.service';
import { ProductService } from './product.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let customerRepoMock: Partial<
    Record<keyof Repository<PaymentCustomerEntity>, jest.Mock>
  >;
  let orderRepoMock: Partial<
    Record<keyof Repository<PaymentOrderEntity>, jest.Mock>
  >;
  let refundRequestRepoMock: Partial<
    Record<keyof Repository<PaymentRefundRequestEntity>, jest.Mock>
  >;
  let transactionRepoMock: Partial<
    Record<keyof Repository<PaymentTransactionEntity>, jest.Mock>
  >;
  let subscriptionRepoMock: Partial<
    Record<keyof Repository<PaymentSubscriptionEntity>, jest.Mock>
  >;
  let webhookEventRepoMock: Partial<
    Record<keyof Repository<PaymentWebhookEventEntity>, jest.Mock>
  >;
  let polarProviderMock: {
    name: string;
    createCheckoutSession: jest.Mock;
    createCustomerPortalSession: jest.Mock;
    validateWebhook: jest.Mock;
  };
  let gatewayFactoryMock: {
    getProvider: jest.Mock;
    hasProvider: jest.Mock;
  };
  let productServiceMock: {
    getProductBySlugAndInterval: jest.Mock;
  };
  let notificationServiceMock: {
    notifyAdmins: jest.Mock;
  };
  let mailServiceMock: {
    sendAdminRefundRequestedEmail: jest.Mock;
    sendCustomerRefundReviewedEmail: jest.Mock;
  };
  let configServiceMock: {
    get: jest.Mock;
    getOrThrow: jest.Mock;
  };

  beforeEach(async () => {
    customerRepoMock = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 1 })),
      save: jest
        .fn()
        .mockImplementation((entity) => Promise.resolve({ ...entity, id: 1 })),
      manager: {
        query: jest.fn().mockResolvedValue([]),
      } as any,
    };

    orderRepoMock = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 10 })),
      save: jest
        .fn()
        .mockImplementation((entity) => Promise.resolve({ ...entity, id: 10 })),
      find: jest.fn().mockResolvedValue([]),
    };

    refundRequestRepoMock = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 50 })),
      save: jest
        .fn()
        .mockImplementation((entity) => Promise.resolve({ ...entity, id: 50 })),
      find: jest.fn().mockResolvedValue([]),
    };

    transactionRepoMock = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 20 })),
      save: jest
        .fn()
        .mockImplementation((entity) => Promise.resolve({ ...entity, id: 20 })),
    };

    subscriptionRepoMock = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 30 })),
      save: jest
        .fn()
        .mockImplementation((entity) => Promise.resolve({ ...entity, id: 30 })),
      find: jest.fn().mockResolvedValue([]),
    };

    webhookEventRepoMock = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 40 })),
      save: jest
        .fn()
        .mockImplementation((entity) => Promise.resolve({ ...entity, id: 40 })),
    };

    polarProviderMock = {
      name: 'polar',
      createCheckoutSession: jest.fn().mockResolvedValue({
        providerCheckoutId: 'chk_123',
        checkoutUrl: 'https://sandbox.polar.sh/checkout/chk_123',
        amount: 2900,
        currency: 'usd',
      }),
      createCustomerPortalSession: jest.fn().mockResolvedValue({
        portalUrl: 'https://sandbox.polar.sh/portal/token_123',
      }),
      validateWebhook: jest.fn(),
    };

    gatewayFactoryMock = {
      getProvider: jest.fn().mockReturnValue(polarProviderMock),
      hasProvider: jest.fn().mockReturnValue(true),
    };

    productServiceMock = {
      getProductBySlugAndInterval: jest.fn().mockResolvedValue({
        id: 1,
        planSlug: 'pro',
        name: 'Pro',
        interval: 'monthly',
        price: 19,
        currency: 'usd',
        polarProductId: 'prod_123',
        isFree: false,
        isActive: true,
      }),
    };

    notificationServiceMock = {
      notifyAdmins: jest.fn().mockResolvedValue({
        inAppCount: 1,
        emailRecipients: [{ id: 1, email: 'admin@example.com' }],
      }),
    };

    mailServiceMock = {
      sendAdminRefundRequestedEmail: jest.fn().mockResolvedValue(''),
      sendCustomerRefundReviewedEmail: jest.fn().mockResolvedValue(''),
    };

    configServiceMock = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
      getOrThrow: jest
        .fn()
        .mockReturnValue('http://localhost:5173/reset-password'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(PaymentCustomerEntity),
          useValue: customerRepoMock,
        },
        {
          provide: getRepositoryToken(PaymentOrderEntity),
          useValue: orderRepoMock,
        },
        {
          provide: getRepositoryToken(PaymentRefundRequestEntity),
          useValue: refundRequestRepoMock,
        },
        {
          provide: getRepositoryToken(PaymentTransactionEntity),
          useValue: transactionRepoMock,
        },
        {
          provide: getRepositoryToken(PaymentSubscriptionEntity),
          useValue: subscriptionRepoMock,
        },
        {
          provide: getRepositoryToken(PaymentWebhookEventEntity),
          useValue: webhookEventRepoMock,
        },
        {
          provide: PaymentGatewayFactory,
          useValue: gatewayFactoryMock,
        },
        {
          provide: ProductService,
          useValue: productServiceMock,
        },
        {
          provide: NotificationService,
          useValue: notificationServiceMock,
        },
        {
          provide: MailService,
          useValue: mailServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: PolarService,
          useValue: {
            cancelSubscription: jest.fn(),
            revokeSubscription: jest.fn(),
            getOrderInvoice: jest.fn(),
            getOrderReceipt: jest.fn(),
            createRefund: jest.fn(),
            listCustomers: jest.fn(),
            listSubscriptions: jest.fn(),
            listOrders: jest.fn(),
          },
        },
        {
          provide: DiscountService,
          useValue: {
            syncDiscountFromPolar: jest.fn(),
            deleteDiscountByPolarId: jest.fn(),
          },
        },
        {
          provide: CustomFieldService,
          useValue: {
            syncCustomFieldFromPolar: jest.fn(),
            deleteCustomFieldByPolarId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckout', () => {
    it('should throw BadRequestException if product is free', async () => {
      productServiceMock.getProductBySlugAndInterval.mockResolvedValueOnce({
        id: 1,
        planSlug: 'starter',
        name: 'Starter',
        interval: 'monthly',
        price: 0,
        currency: 'usd',
        polarProductId: '',
        isFree: true,
      });

      await expect(
        service.createCheckout({
          planSlug: 'starter',
          interval: 'monthly',
          successUrl: 'https://example.com/success',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create an order and call polarService.createCheckoutSession', async () => {
      const result = await service.createCheckout(
        {
          planSlug: 'pro',
          interval: 'monthly',
          successUrl: 'https://example.com/success',
          customerEmail: 'test@example.com',
        },
        { id: 'usr_1', email: 'test@example.com', fullName: 'Test User' },
      );

      expect(orderRepoMock.create).toHaveBeenCalled();
      expect(polarProviderMock.createCheckoutSession).toHaveBeenCalled();
      expect(result.checkoutUrl).toBe(
        'https://sandbox.polar.sh/checkout/chk_123',
      );
      expect(result.checkoutId).toBe('chk_123');
      expect(result.orderNumber).toBeDefined();
    });
  });

  describe('handleWebhook', () => {
    it('should skip event if already processed (Idempotency)', async () => {
      webhookEventRepoMock.findOne!.mockResolvedValue({
        id: 1,
        eventId: 'evt_123',
        status: PaymentWebhookStatus.PROCESSED,
      });

      await service.handleWebhook({
        id: 'evt_123',
        type: 'order.created',
        data: {},
      });

      expect(orderRepoMock.save).not.toHaveBeenCalled();
    });

    it('should process order.created by updating order to PAID and creating a transaction', async () => {
      webhookEventRepoMock.findOne!.mockResolvedValue(null);
      orderRepoMock.findOne!.mockResolvedValue({
        id: 10,
        status: PaymentOrderStatus.PENDING,
        amount: 2900,
        currency: 'usd',
      });
      transactionRepoMock.findOne!.mockResolvedValue(null);

      await service.handleWebhook({
        id: 'evt_new',
        type: 'order.created',
        data: {
          id: 'ord_polar_1',
          checkout_id: 'chk_123',
          amount: 2900,
          currency: 'usd',
          customer: {
            id: 'cus_polar_1',
            email: 'customer@example.com',
            name: 'Customer One',
          },
        },
      });

      expect(orderRepoMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentOrderStatus.PAID,
          polarOrderId: 'ord_polar_1',
        }),
      );
      expect(transactionRepoMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: PaymentTransactionType.CHARGE,
          status: PaymentTransactionStatus.SUCCESS,
        }),
      );
    });

    it('should process subscription.created by creating a subscription record', async () => {
      webhookEventRepoMock.findOne!.mockResolvedValue(null);
      subscriptionRepoMock.findOne!.mockResolvedValue(null);

      await service.handleWebhook({
        id: 'evt_sub_1',
        type: 'subscription.created',
        data: {
          id: 'sub_polar_1',
          status: 'active',
          product_id: 'prod_123',
          customer: {
            id: 'cus_polar_1',
            email: 'sub@example.com',
          },
          current_period_start: new Date().toISOString(),
          current_period_end: new Date().toISOString(),
        },
      });

      expect(subscriptionRepoMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          polarSubscriptionId: 'sub_polar_1',
          status: PaymentSubscriptionStatus.ACTIVE,
        }),
      );
      expect(subscriptionRepoMock.save).toHaveBeenCalled();
    });
  });

  describe('createCustomerPortalSession', () => {
    it('should return portalUrl for an existing customer', async () => {
      customerRepoMock.findOne!.mockResolvedValue({
        id: 1,
        polarCustomerId: 'cus_polar_1',
      });

      const result = await service.createCustomerPortalSession(
        { customerEmail: 'test@example.com' },
        { id: 'usr_1', email: 'test@example.com' },
      );

      expect(
        polarProviderMock.createCustomerPortalSession,
      ).toHaveBeenCalledWith({
        customerId: 'cus_polar_1',
        externalCustomerId: undefined,
      });
      expect(result.portalUrl).toBe(
        'https://sandbox.polar.sh/portal/token_123',
      );
    });
  });
});
