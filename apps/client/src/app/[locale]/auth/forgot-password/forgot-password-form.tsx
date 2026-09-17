"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import xior, { XiorError } from "xior";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordForm() {
  const t = useTranslations("Auth.forgotPassword");

  const forgotPasswordFormSchema = z.object({
    email: z.email(t("email")),
  });

  type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      await xior.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/auth/forgot-password`,
        values
      );
      toast.success(t("successToast"));
      form.reset();
    } catch (error) {
      if (error instanceof XiorError) {
        toast.error(error.response?.data?.message || t("errorToast"));
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
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link
            href="/auth/login"
            className="text-primary text-sm hover:underline"
          >
            {t("backToSignIn")}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
