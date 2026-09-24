import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from '../services/payment.service';
import { ProductService } from '../services/product.service';
import { PaymentController } from './payment.controller';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentServiceMock: {
    createCheckout: jest.Mock;
    createCustomerPortalSession: jest.Mock;
    getUserOrders: jest.Mock;
    getUserSubscriptions: jest.Mock;
  };
  let productServiceMock: {
    getActiveProducts: jest.Mock;
  };

  beforeEach(async () => {
    paymentServiceMock = {
      createCheckout: jest.fn().mockResolvedValue({
        checkoutUrl: 'https://sandbox.polar.sh/checkout/chk_123',
        checkoutId: 'chk_123',
        orderNumber: 'ORD-123',
      }),
      createCustomerPortalSession: jest.fn().mockResolvedValue({
        portalUrl: 'https://sandbox.polar.sh/portal/token_123',
      }),
      getUserOrders: jest.fn().mockResolvedValue([]),
      getUserSubscriptions: jest.fn().mockResolvedValue([]),
    };

    productServiceMock = {
      getActiveProducts: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: paymentServiceMock,
        },
        {
          provide: ProductService,
          useValue: productServiceMock,
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get active products', async () => {
    const result = await controller.getProducts();
    expect(productServiceMock.getActiveProducts).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should create checkout session', async () => {
    const result = await controller.createCheckout({
      planSlug: 'pro',
      interval: 'monthly',
      successUrl: 'https://example.com/success',
    });

    expect(paymentServiceMock.createCheckout).toHaveBeenCalled();
    expect(result.checkoutUrl).toBe(
      'https://sandbox.polar.sh/checkout/chk_123',
    );
  });

  it('should create customer portal session', async () => {
    const result = await controller.createCustomerPortal({
      customerEmail: 'test@example.com',
    });

    expect(paymentServiceMock.createCustomerPortalSession).toHaveBeenCalled();
    expect(result.portalUrl).toBe('https://sandbox.polar.sh/portal/token_123');
  });

  it('should retrieve user orders', async () => {
    const result = await controller.getMyOrders('usr_1');
    expect(paymentServiceMock.getUserOrders).toHaveBeenCalledWith(
      'usr_1',
      undefined,
    );
    expect(result).toEqual([]);
  });

  it('should retrieve user subscriptions', async () => {
    const result = await controller.getMySubscriptions('usr_1');
    expect(paymentServiceMock.getUserSubscriptions).toHaveBeenCalledWith(
      'usr_1',
      undefined,
    );
    expect(result).toEqual([]);
  });
});
