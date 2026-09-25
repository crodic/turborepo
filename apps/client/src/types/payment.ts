export interface PaymentProduct {
  id: string | number;
  planSlug: string;
  name: string;
  description?: string | null;
  interval: "monthly" | "yearly" | "one_time";
  price: number;
  currency: string;
  prices?: Array<{
    id?: string;
    amount: number;
    currency: string;
    isArchived?: boolean;
  }>;
  polarProductId?: string;
  features: string[];
  metadata?: Record<string, any>;
  benefits?: Array<Record<string, any>>;
  medias?: Array<Record<string, any>>;
  trialInterval?: string | null;
  trialIntervalCount?: number | null;
  badge?: string | null;
  ctaText: string;
  isPopular: boolean;
  isFree: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface PaymentOrder {
  id: string | number;
  orderNumber: string;
  orderId?: string;
  polarCheckoutId?: string | null;
  polarOrderId?: string | null;
  customerId?: string | number | null;
  userId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  amount: number;
  taxAmount?: number;
  currency: string;
  status: "pending" | "paid" | "refunded" | "canceled" | "failed";
  productId?: string | null;
  productTitle?: string | null;
  productName?: string | null;
  subscriptionId?: string | null;
  invoiceUrl?: string | null;
  receiptUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSubscription {
  id: string | number;
  polarSubscriptionId?: string;
  subscriptionId?: string;
  polarCustomerId?: string;
  customerId?: string | number | null;
  userId?: string | null;
  customerEmail?: string | null;
  productId: string;
  productTitle?: string | null;
  productName?: string | null;
  priceId?: string | null;
  status:
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "paused";
  amount?: number;
  currency?: string;
  recurringInterval?: "month" | "year";
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  endedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCheckoutPayload {
  planSlug: string;
  interval: "monthly" | "yearly" | "one_time";
  productId?: string;
  successUrl: string;
  customerEmail?: string;
  customerName?: string;
  userId?: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  url?: string;
  checkoutId: string;
  orderNumber: string;
}

export interface CustomerPortalPayload {
  customerId?: string;
  customerEmail?: string;
  userId?: string;
}

export interface CustomerPortalResponse {
  portalUrl: string;
  url?: string;
}

export interface PaymentRefundRequest {
  id: string | number;
  orderId: string | number;
  orderNumber?: string;
  customerEmail?: string;
  userId?: string | number | null;
  amount: number;
  currency: string;
  reason: string;
  customerNote?: string | null;
  status: "pending" | "approved" | "rejected" | "processed";
  adminNote?: string | null;
  reviewedBy?: string | number | null;
  reviewedAt?: string | null;
  polarRefundId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRefundRequestPayload {
  reason: string;
  customerNote?: string;
}
