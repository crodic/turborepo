"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/http";
import { extractErrorMessage } from "@/hooks/use-profile";
import {
  CheckoutResponse,
  CreateCheckoutPayload,
  CreateRefundRequestPayload,
  CustomerPortalPayload,
  CustomerPortalResponse,
  PaymentOrder,
  PaymentProduct,
  PaymentRefundRequest,
  PaymentSubscription,
} from "@/types/payment";
import { toast } from "sonner";

export const PAYMENT_SUBSCRIPTIONS_QUERY_KEY = [
  "payment-subscriptions",
] as const;
export const PAYMENT_ORDERS_QUERY_KEY = ["payment-orders"] as const;
export const PRICING_PRODUCTS_QUERY_KEY = ["pricing-products"] as const;
export const PAYMENT_REFUND_REQUESTS_QUERY_KEY = [
  "payment-refund-requests",
] as const;

export function usePricingProducts() {
  return useQuery<PaymentProduct[]>({
    queryKey: PRICING_PRODUCTS_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await http.get<PaymentProduct[]>(
          "/api/v1/payments/products"
        );
        return response.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUserSubscriptions() {
  return useQuery<PaymentSubscription[]>({
    queryKey: PAYMENT_SUBSCRIPTIONS_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await http.get<PaymentSubscription[]>(
          "/api/v1/payments/subscriptions"
        );
        return response.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useUserOrders() {
  return useQuery<PaymentOrder[]>({
    queryKey: PAYMENT_ORDERS_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await http.get<PaymentOrder[]>(
          "/api/v1/payments/orders"
        );
        return response.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateCheckoutSession() {
  return useMutation<CheckoutResponse, Error, CreateCheckoutPayload>({
    mutationFn: async (payload) => {
      const response = await http.post<CheckoutResponse>(
        "/api/v1/payments/checkout",
        payload
      );
      return response.data;
    },
    onSuccess: (data) => {
      const redirectUrl = data?.checkoutUrl || data?.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    },
    onError: (error) => {
      const msg = extractErrorMessage(
        error,
        "Failed to create checkout session. Please try again."
      );
      toast.error(msg);
    },
  });
}

export function useCustomerPortalSession() {
  const queryClient = useQueryClient();

  return useMutation<
    CustomerPortalResponse,
    Error,
    CustomerPortalPayload | void
  >({
    mutationFn: async (payload) => {
      const response = await http.post<CustomerPortalResponse>(
        "/api/v1/payments/customer-portal",
        payload || {}
      );
      return response.data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: PAYMENT_SUBSCRIPTIONS_QUERY_KEY,
      });
      const redirectUrl = data?.portalUrl || data?.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    },
    onError: (error) => {
      const msg = extractErrorMessage(
        error,
        "Failed to open customer billing portal. Please try again."
      );
      toast.error(msg);
    },
  });
}

export function useUserRefundRequests() {
  return useQuery<PaymentRefundRequest[]>({
    queryKey: PAYMENT_REFUND_REQUESTS_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await http.get<PaymentRefundRequest[]>(
          "/api/v1/payments/refund-requests"
        );
        return response.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateRefundRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    PaymentRefundRequest,
    Error,
    { orderId: string | number; data: CreateRefundRequestPayload }
  >({
    mutationFn: async ({ orderId, data }) => {
      const response = await http.post<PaymentRefundRequest>(
        `/api/v1/payments/orders/${orderId}/refund-request`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: PAYMENT_ORDERS_QUERY_KEY,
      });
      void queryClient.invalidateQueries({
        queryKey: PAYMENT_REFUND_REQUESTS_QUERY_KEY,
      });
      toast.success(
        "Refund request submitted successfully. Our team will review it shortly."
      );
    },
    onError: (error) => {
      const msg = extractErrorMessage(
        error,
        "Failed to submit refund request. Please try again."
      );
      toast.error(msg);
    },
  });
}
