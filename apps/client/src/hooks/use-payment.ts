"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/http";
import { extractErrorMessage } from "@/hooks/use-profile";
import {
  CheckoutResponse,
  CreateCheckoutPayload,
  CustomerPortalResponse,
  PaymentOrder,
  PaymentSubscription,
} from "@/types/payment";
import { toast } from "sonner";

export const PAYMENT_SUBSCRIPTIONS_QUERY_KEY = [
  "payment-subscriptions",
] as const;
export const PAYMENT_ORDERS_QUERY_KEY = ["payment-orders"] as const;

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
      if (data?.url) {
        window.location.href = data.url;
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

  return useMutation<CustomerPortalResponse, Error, void>({
    mutationFn: async () => {
      const response = await http.post<CustomerPortalResponse>(
        "/api/v1/payments/customer-portal",
        {}
      );
      return response.data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: PAYMENT_SUBSCRIPTIONS_QUERY_KEY,
      });
      if (data?.url) {
        window.location.href = data.url;
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
