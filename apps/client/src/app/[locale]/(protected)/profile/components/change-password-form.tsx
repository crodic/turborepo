"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { extractErrorMessage, useChangePassword } from "@/hooks/use-profile";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { KeyRound, Loader2 } from "lucide-react";

export function ChangePasswordForm() {
  const t = useTranslations("Security.password");
  const changePasswordMutation = useChangePassword();

  const changePasswordSchema = z
    .object({
      currentPassword: z.string().min(1, t("validation.currentRequired")),
      newPassword: z.string().min(8, t("validation.min")),
      confirmNewPassword: z.string().min(1, t("validation.min")),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: t("validation.match"),
      path: ["confirmNewPassword"],
    });

  type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const onSubmit = async (values: ChangePasswordValues) => {
    try {
      await changePasswordMutation.mutateAsync({
        password: values.currentPassword,
        newPassword: values.newPassword,
        confirmNewPassword: values.confirmNewPassword,
      });
      toast.success(t("changeSuccess"));
      form.reset();
    } catch (error) {
      const msg = extractErrorMessage(error, t("changeError"));
      toast.error(msg);
    }
  };

  const isSubmitting = changePasswordMutation.isPending;

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="text-primary size-5" />
          <CardTitle className="text-xl">{t("changeTitle")}</CardTitle>
        </div>
        <CardDescription>{t("changeDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("currentPassword")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t("currentPasswordPlaceholder")}
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("newPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t("newPasswordPlaceholder")}
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
                name="confirmNewPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("confirmNewPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t("confirmNewPasswordPlaceholder")}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t("updating")}
                  </>
                ) : (
                  t("submitChange")
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
