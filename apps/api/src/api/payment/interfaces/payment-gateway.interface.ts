export type GatewayCheckoutInput = {
  productId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  successUrl: string;
  customerEmail?: string;
  customerName?: string;
  externalCustomerId?: string;
  metadata?: Record<string, any>;
};

export type GatewayCheckoutOutput = {
  checkoutUrl: string;
  providerCheckoutId?: string;
  amount?: number;
  currency?: string;
  raw?: any;
};

export type GatewayCustomerPortalInput = {
  customerId?: string;
  externalCustomerId?: string;
};

export type GatewayCustomerPortalOutput = {
  portalUrl: string;
};

export interface IPaymentGateway {
  readonly name: string;

  createCheckoutSession(
    input: GatewayCheckoutInput,
  ): Promise<GatewayCheckoutOutput>;

  createCustomerPortalSession?(
    input: GatewayCustomerPortalInput,
  ): Promise<GatewayCustomerPortalOutput>;

  validateWebhook(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<any>;
}
