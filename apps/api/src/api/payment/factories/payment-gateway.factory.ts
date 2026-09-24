import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { IPaymentGateway } from '../interfaces/payment-gateway.interface';
import { PolarProvider } from '../providers/polar.provider';

@Injectable()
export class PaymentGatewayFactory {
  private readonly logger = new Logger(PaymentGatewayFactory.name);
  private readonly providers = new Map<string, IPaymentGateway>();

  constructor(private readonly polarProvider: PolarProvider) {
    this.registerProvider(this.polarProvider);
  }

  registerProvider(provider: IPaymentGateway) {
    this.providers.set(provider.name.toLowerCase(), provider);
    this.logger.log(`Payment gateway provider registered: [${provider.name}]`);
  }

  getProvider(name: string = 'polar'): IPaymentGateway {
    const key = (name || 'polar').toLowerCase();
    const provider = this.providers.get(key);
    if (!provider) {
      throw new BadRequestException(
        `Payment gateway provider '${name}' is not supported or configured.`,
      );
    }
    return provider;
  }

  hasProvider(name: string): boolean {
    return this.providers.has((name || '').toLowerCase());
  }

  getAvailableGateways(): string[] {
    return Array.from(this.providers.keys());
  }
}
