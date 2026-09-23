import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PolarService } from './polar.service';

describe('PolarService', () => {
  let service: PolarService;
  let configServiceMock: { get: jest.Mock };

  describe('when unconfigured', () => {
    beforeEach(async () => {
      configServiceMock = {
        get: jest.fn().mockReturnValue(null),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PolarService,
          {
            provide: ConfigService,
            useValue: configServiceMock,
          },
        ],
      }).compile();

      service = module.get<PolarService>(PolarService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should throw ServiceUnavailableException when creating checkout session', async () => {
      await expect(
        service.createCheckoutSession({
          productId: 'prod_123',
          successUrl: 'https://example.com/success',
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException when creating customer session', async () => {
      await expect(
        service.createCustomerSession({
          customerId: 'cus_123',
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException when validating webhook without secret', () => {
      expect(() => service.validateWebhookEvent('{"test": true}', {})).toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
