import { Injectable, Logger } from '@nestjs/common';
import {
  GatewayCheckoutInput,
  GatewayCheckoutOutput,
  GatewayCustomerPortalInput,
  GatewayCustomerPortalOutput,
  IPaymentGateway,
} from '../interfaces/payment-gateway.interface';
import { PolarService } from '../services/polar.service';

@Injectable()
export class PolarProvider implements IPaymentGateway {
  readonly name = 'polar';
  private readonly logger = new Logger(PolarProvider.name);

  constructor(private readonly polarService: PolarService) {}

  async createCheckoutSession(
    input: GatewayCheckoutInput,
  ): Promise<GatewayCheckoutOutput> {
    const session = await this.polarService.createCheckoutSession({
      productId: input.productId,
      successUrl: input.successUrl,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      externalCustomerId: input.externalCustomerId,
      metadata: {
        ...input.metadata,
        orderNumber: input.orderNumber,
      },
    });

    return {
      checkoutUrl: session.url,
      providerCheckoutId: session.id,
      amount: session.amount ?? undefined,
      currency: session.currency ?? undefined,
      raw: session,
    };
  }

  async createCustomerPortalSession(
    input: GatewayCustomerPortalInput,
  ): Promise<GatewayCustomerPortalOutput> {
    const session = await this.polarService.createCustomerSession({
      customerId: input.customerId,
      externalCustomerId: input.externalCustomerId,
    });

    return {
      portalUrl: session.customerPortalUrl,
    };
  }

  async createRefund(
    input: import('../interfaces/payment-gateway.interface').GatewayRefundInput,
  ): Promise<
    import('../interfaces/payment-gateway.interface').GatewayRefundOutput
  > {
    const refund = await this.polarService.createRefund({
      orderId: input.orderId,
      amount: input.amount,
      reason: input.reason,
      comment: input.comment,
    });

    return {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount,
      raw: refund,
    };
  }

  async validateWebhook(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<any> {
    return this.polarService.validateWebhookEvent(payload, headers);
  }
}
