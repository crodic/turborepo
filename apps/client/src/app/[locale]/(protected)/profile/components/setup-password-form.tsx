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
import { extractErrorMessage, useSetupPassword } from "@/hooks/use-profile";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { KeyRound, Loader2 } from "lucide-react";

export function SetupPasswordForm() {
  const t = useTranslations("Security.password");
  const setupPasswordMutation = useSetupPassword();

  const setupPasswordSchema = z
    .object({
      password: z.string().min(8, t("validation.min")),
      confirmPassword: z.string().min(1, t("validation.min")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("validation.match"),
      path: ["confirmPassword"],
    });

  type SetupPasswordValues = z.infer<typeof setupPasswordSchema>;

  const form = useForm<SetupPasswordValues>({
    resolver: zodResolver(setupPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: SetupPasswordValues) => {
    try {
      await setupPasswordMutation.mutateAsync({
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      toast.success(t("setupSuccess"));
      form.reset();
    } catch (error) {
      const msg = extractErrorMessage(error, t("setupError"));
      toast.error(msg);
    }
  };

  const isSubmitting = setupPasswordMutation.isPending;

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="text-primary size-5" />
          <CardTitle className="text-xl">{t("setupTitle")}</CardTitle>
        </div>
        <CardDescription>{t("setupDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("confirmPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t("confirmPasswordPlaceholder")}
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
                    {t("settingUp")}
                  </>
                ) : (
                  t("submitSetup")
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
