import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { PaymentService } from './payment.service';
import { PolarService } from './polar.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let customerRepoMock: Partial<
    Record<keyof Repository<PaymentCustomerEntity>, jest.Mock>
  >;
  let orderRepoMock: Partial<
    Record<keyof Repository<PaymentOrderEntity>, jest.Mock>
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
  let polarServiceMock: {
    createCheckoutSession: jest.Mock;
    createCustomerSession: jest.Mock;
  };

  beforeEach(async () => {
    customerRepoMock = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 1 })),
      save: jest
        .fn()
        .mockImplementation((entity) => Promise.resolve({ ...entity, id: 1 })),
    };

    orderRepoMock = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 10 })),
      save: jest
        .fn()
        .mockImplementation((entity) => Promise.resolve({ ...entity, id: 10 })),
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

    polarServiceMock = {
      createCheckoutSession: jest.fn().mockResolvedValue({
        id: 'chk_123',
        url: 'https://sandbox.polar.sh/checkout/chk_123',
        amount: 2900,
        currency: 'usd',
      }),
      createCustomerSession: jest.fn().mockResolvedValue({
        customerPortalUrl: 'https://sandbox.polar.sh/portal/token_123',
      }),
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
          provide: PolarService,
          useValue: polarServiceMock,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckout', () => {
    it('should throw BadRequestException if neither customerEmail nor userId is provided', async () => {
      await expect(
        service.createCheckout({
          productId: 'prod_123',
          successUrl: 'https://example.com/success',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create an order and call polarService.createCheckoutSession', async () => {
      const result = await service.createCheckout(
        {
          productId: 'prod_123',
          successUrl: 'https://example.com/success',
          customerEmail: 'test@example.com',
        },
        { id: 'usr_1', email: 'test@example.com', fullName: 'Test User' },
      );

      expect(orderRepoMock.create).toHaveBeenCalled();
      expect(polarServiceMock.createCheckoutSession).toHaveBeenCalled();
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

      expect(polarServiceMock.createCustomerSession).toHaveBeenCalledWith({
        customerId: 'cus_polar_1',
        externalCustomerId: undefined,
      });
      expect(result.portalUrl).toBe(
        'https://sandbox.polar.sh/portal/token_123',
      );
    });
  });
});
