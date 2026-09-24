import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PolarProvider } from '../providers/polar.provider';
import { PaymentGatewayFactory } from './payment-gateway.factory';

describe('PaymentGatewayFactory', () => {
  let factory: PaymentGatewayFactory;
  let polarProviderMock: Partial<PolarProvider>;

  beforeEach(async () => {
    polarProviderMock = {
      name: 'polar',
      createCheckoutSession: jest.fn(),
      createCustomerPortalSession: jest.fn(),
      validateWebhook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentGatewayFactory,
        {
          provide: PolarProvider,
          useValue: polarProviderMock,
        },
      ],
    }).compile();

    factory = module.get<PaymentGatewayFactory>(PaymentGatewayFactory);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  it('should return polar provider by default', () => {
    const provider = factory.getProvider();
    expect(provider).toBeDefined();
    expect(provider.name).toBe('polar');
  });

  it('should return polar provider when explicitly requested', () => {
    const provider = factory.getProvider('polar');
    expect(provider).toBeDefined();
    expect(provider.name).toBe('polar');
  });

  it('should throw BadRequestException for unknown provider', () => {
    expect(() => factory.getProvider('unknown')).toThrow(BadRequestException);
  });

  it('should list available gateways', () => {
    expect(factory.getAvailableGateways()).toContain('polar');
  });
});
