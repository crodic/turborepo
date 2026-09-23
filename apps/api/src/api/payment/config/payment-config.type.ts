export type PaymentConfig = {
  accessToken?: string;
  webhookSecret?: string;
  server: 'production' | 'sandbox';
  organizationId?: string;
};
