export interface PaymentOrder {
  id: string;
  orderId: string;
  checkoutId?: string | null;
  customerId?: string | null;
  userId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  amount: number;
  taxAmount: number;
  currency: string;
  status: "pending" | "paid" | "refunded" | "partially_refunded" | "failed";
  productId?: string | null;
  productName?: string | null;
  subscriptionId?: string | null;
  invoiceUrl?: string | null;
  receiptUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSubscription {
  id: string;
  subscriptionId: string;
  customerId: string;
  userId?: string | null;
  customerEmail?: string | null;
  productId: string;
  productName?: string | null;
  priceId?: string | null;
  status:
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid";
  amount: number;
  currency: string;
  recurringInterval: "month" | "year";
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  endedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCheckoutPayload {
  productId: string;
  successUrl: string;
  customerEmail?: string;
  customerName?: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  url?: string;
  checkoutId: string;
  orderNumber: string;
}

export interface CustomerPortalResponse {
  portalUrl: string;
  url?: string;
}
