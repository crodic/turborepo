"use client";

import { useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginResponseData } from "@/types/apis";
import xior, { XiorError } from "xior";
import { http } from "@/lib/http";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

export default function LoginForm() {
  const t = useTranslations("Auth.login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledMessageRef = useRef<string | null>(null);

  const loginFormSchema = z.object({
    email: z.string().min(1, t("email")),
    password: z.string().min(1, t("password")),
  });

  type LoginFormValues = z.infer<typeof loginFormSchema>;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const verification = searchParams.get("verification");
    const reset = searchParams.get("reset");
    const social = searchParams.get("social");
    const messageKey = verification ?? reset ?? social;

    if (!messageKey || handledMessageRef.current === messageKey) {
      return;
    }

    handledMessageRef.current = messageKey;

    if (verification === "success") {
      toast.success(t("toasts.verificationSuccess"));
    }

    if (verification === "failed") {
      toast.error(t("toasts.verificationFailed"));
    }

    if (reset === "success") {
      toast.success(t("toasts.resetSuccess"));
    }

    if (social === "failed") {
      toast.error(t("toasts.socialFailed"));
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("verification");
    nextSearchParams.delete("reset");
    nextSearchParams.delete("social");
    const nextQuery = nextSearchParams.toString();

    router.replace(nextQuery ? `/auth/login?${nextQuery}` : "/auth/login");
  }, [router, searchParams, t]);

  async function onSubmit(values: LoginFormValues) {
    try {
      const { data } = await http.post<LoginResponseData>(
        "api/v1/user/auth/login",
        values
      );
      const { accessToken, refreshToken } = data;
      await xior.post(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tokens`, {
        accessToken,
        refreshToken,
      });
      window.dispatchEvent(new Event("auth:tokens-updated"));
      router.push("/profile");
    } catch (error) {
      if (error instanceof XiorError) {
        toast.error(error.response?.data?.message || t("toasts.loginError"));
      } else {
        toast.error(t("toasts.loginError"));
      }
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24">
      <Card className="w-100">
        <CardHeader>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("emailPlaceholder")}
                        autoComplete="email"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("password")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t("passwordPlaceholder")}
                        autoComplete="current-password"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Link
                  href="/auth/forgot-password"
                  className="text-primary text-sm hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t("submitting")}
                  </>
                ) : (
                  t("submit")
                )}
              </Button>
              <Button
                type="button"
                className="w-full"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => {
                  window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/auth/social/google`;
                }}
              >
                {t("continueGoogle")}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-muted-foreground text-sm">
            {t("noAccount")}{" "}
            <Link
              href="/auth/sign-up"
              className="text-primary font-medium hover:underline"
            >
              {t("signUp")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
