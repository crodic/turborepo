"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import xior from "xior";
import { LoginResponseData } from "@/types/apis";

export default function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }

    handledRef.current = true;

    const token = searchParams.get("token");

    if (!token) {
      toast.error("Google sign-in failed. Please try again.");
      router.replace("/auth/login?social=failed");
      return;
    }

    const exchangeToken = async () => {
      try {
        const { data } = await xior.post<LoginResponseData>(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/auth/social/exchange`,
          { token }
        );

        await xior.post(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tokens`, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });

        window.dispatchEvent(new Event("auth:tokens-updated"));
        toast.success("Signed in with Google.");
        router.replace("/client-profile");
      } catch {
        toast.error("Google sign-in failed. Please try again.");
        router.replace("/auth/login?social=failed");
      }
    };

    void exchangeToken();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <p className="text-muted-foreground text-sm">
        Finishing Google sign-in...
      </p>
    </div>
  );
}
