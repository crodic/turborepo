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

const loginFormSchema = z.object({
  email: z.string(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledMessageRef = useRef<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "kris.bayer79@gmail.com",
      password: "12345678",
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
      toast.success("Your account has been verified. You can sign in now.");
    }

    if (verification === "failed") {
      toast.error(
        "We could not verify your account. The link may be invalid or expired."
      );
    }

    if (reset === "success") {
      toast.success("Your password has been reset. Please sign in.");
    }

    if (social === "failed") {
      toast.error("Google sign-in failed. Please try again.");
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("verification");
    nextSearchParams.delete("reset");
    nextSearchParams.delete("social");
    const nextQuery = nextSearchParams.toString();

    router.replace(nextQuery ? `/auth/login?${nextQuery}` : "/auth/login");
  }, [router, searchParams]);

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
      router.push("/client-profile");
    } catch (error) {
      if (error instanceof XiorError) {
        toast.error(
          error.response?.data?.message || "Login failed. Please try again."
        );
      }
    }
  }

  return (
    <div className="flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24">
      <Card className="w-100">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
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
                  Forgot password?
                </Link>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Loading..." : "Login"}
              </Button>
              <Button
                type="button"
                className="w-full"
                variant="outline"
                onClick={() => {
                  window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/auth/social/google`;
                }}
              >
                Continue with Google
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-muted-foreground text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/auth/sign-up" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
