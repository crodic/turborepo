"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/http";
import { getClientToken } from "@/services/apis";
import { SocialAccount, User } from "@/types/apis";
import { useRouter } from "@/i18n/navigation";
import xior from "xior";

export const PROFILE_QUERY_KEY = ["user-profile"] as const;
export const SOCIAL_ACCOUNTS_QUERY_KEY = ["user-social-accounts"] as const;

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const res = (
      error as { response?: { data?: { message?: string | string[] } } }
    ).response;
    const msg = res?.data?.message;
    if (Array.isArray(msg)) {
      return msg.join(", ");
    }
    if (typeof msg === "string") {
      return msg;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function useProfile() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleTokensUpdated = () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: SOCIAL_ACCOUNTS_QUERY_KEY,
      });
    };

    window.addEventListener("auth:tokens-updated", handleTokensUpdated);
    return () => {
      window.removeEventListener("auth:tokens-updated", handleTokensUpdated);
    };
  }, [queryClient]);

  return useQuery<User | null>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await http.get<User>("/api/v1/user/auth/me");
        return response.data;
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}

export function useSocialAccounts() {
  return useQuery<SocialAccount[]>({
    queryKey: SOCIAL_ACCOUNTS_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await http.get<SocialAccount[]>(
          "/api/v1/user/auth/me/social-accounts"
        );
        return response.data;
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      const response = await http.put<{ message: string }>(
        "/api/v1/user/auth/me",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      password: string;
      newPassword: string;
      confirmNewPassword: string;
    }) => {
      const response = await http.post<{ message: string }>(
        "/api/v1/user/auth/me/change-password",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}

export function useSetupPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { password: string; confirmPassword: string }) => {
      const response = await http.post<{ message: string }>(
        "/api/v1/user/auth/me/setup-password",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}

export function useLinkGoogle() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await http.post<{ url: string }>(
        "/api/v1/user/auth/me/social/google/link"
      );
      return data.url;
    },
    onSuccess: (url) => {
      if (typeof window !== "undefined") {
        window.location.href = url;
      }
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      try {
        const tokens = await getClientToken();
        if (tokens?.refreshToken) {
          await http.post("/api/v1/user/auth/logout", {
            refreshToken: tokens.refreshToken,
          });
        }
      } catch (err) {
        // Proceed with client logout even if server token revocation fails
        console.error("Server logout error:", err);
      }

      await xior.post<{ message: string }>(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/logout`,
        {
          credentials: "same-origin",
        }
      );

      window.dispatchEvent(new Event("auth:tokens-updated"));
      queryClient.setQueryData(PROFILE_QUERY_KEY, null);
      queryClient.setQueryData(SOCIAL_ACCOUNTS_QUERY_KEY, []);
      router.push("/auth/login");
    },
  });
}
