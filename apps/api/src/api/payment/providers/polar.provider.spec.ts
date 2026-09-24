import { Test, TestingModule } from '@nestjs/testing';
import { PolarService } from '../services/polar.service';
import { PolarProvider } from './polar.provider';

describe('PolarProvider', () => {
  let provider: PolarProvider;
  let polarServiceMock: {
    createCheckoutSession: jest.Mock;
    createCustomerSession: jest.Mock;
    validateWebhookEvent: jest.Mock;
  };

  beforeEach(async () => {
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
      validateWebhookEvent: jest
        .fn()
        .mockReturnValue({ id: 'evt_1', type: 'order.created' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolarProvider,
        {
          provide: PolarService,
          useValue: polarServiceMock,
        },
      ],
    }).compile();

    provider = module.get<PolarProvider>(PolarProvider);
  });

  it('should be defined with name polar', () => {
    expect(provider).toBeDefined();
    expect(provider.name).toBe('polar');
  });

  it('should create checkout session through polarService', async () => {
    const result = await provider.createCheckoutSession({
      productId: 'prod_123',
      orderNumber: 'ORD-123',
      amount: 2900,
      currency: 'usd',
      successUrl: 'https://example.com/success',
      customerEmail: 'test@example.com',
    });

    expect(polarServiceMock.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'prod_123',
        successUrl: 'https://example.com/success',
        customerEmail: 'test@example.com',
        metadata: { orderNumber: 'ORD-123' },
      }),
    );
    expect(result.checkoutUrl).toBe(
      'https://sandbox.polar.sh/checkout/chk_123',
    );
    expect(result.providerCheckoutId).toBe('chk_123');
    expect(result.amount).toBe(2900);
  });

  it('should create customer portal session through polarService', async () => {
    const result = await provider.createCustomerPortalSession({
      customerId: 'cus_123',
    });

    expect(polarServiceMock.createCustomerSession).toHaveBeenCalledWith({
      customerId: 'cus_123',
      externalCustomerId: undefined,
    });
    expect(result.portalUrl).toBe('https://sandbox.polar.sh/portal/token_123');
  });

  it('should validate webhook through polarService', async () => {
    const payload = '{"id":"evt_1"}';
    const headers = { 'webhook-id': 'wh_1' };
    const result = await provider.validateWebhook(payload, headers);

    expect(polarServiceMock.validateWebhookEvent).toHaveBeenCalledWith(
      payload,
      headers,
    );
    expect(result).toEqual({ id: 'evt_1', type: 'order.created' });
  });
});
