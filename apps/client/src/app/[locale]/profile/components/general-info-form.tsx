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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { extractErrorMessage, useUpdateProfile } from "@/hooks/use-profile";
import { User } from "@/types/apis";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";

interface GeneralInfoFormProps {
  profile: User;
}

export function GeneralInfoForm({ profile }: GeneralInfoFormProps) {
  const t = useTranslations("GeneralInfo");
  const updateProfileMutation = useUpdateProfile();

  const generalInfoSchema = z.object({
    firstName: z
      .string()
      .trim()
      .min(1, t("validation.firstNameRequired"))
      .max(100, t("validation.firstNameMax")),
    lastName: z
      .string()
      .trim()
      .min(1, t("validation.lastNameRequired"))
      .max(100, t("validation.lastNameMax")),
  });

  type GeneralInfoValues = z.infer<typeof generalInfoSchema>;

  const form = useForm<GeneralInfoValues>({
    resolver: zodResolver(generalInfoSchema),
    defaultValues: {
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
    },
  });

  useEffect(() => {
    form.reset({
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
    });
  }, [profile, form]);

  const onSubmit = async (values: GeneralInfoValues) => {
    try {
      await updateProfileMutation.mutateAsync(values);
      toast.success(t("success"));
    } catch (error) {
      const msg = extractErrorMessage(error, t("error"));
      toast.error(msg);
    }
  };

  const isSubmitting = updateProfileMutation.isPending;

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("firstName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("firstNamePlaceholder")}
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
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("lastName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("lastNamePlaceholder")}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <FormLabel>{t("email")}</FormLabel>
              <Input
                value={profile.email}
                disabled
                className="bg-muted/50 text-muted-foreground cursor-not-allowed"
              />
              <FormDescription className="text-xs">
                {t("emailReadonlyHint")}
              </FormDescription>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  t("saveChanges")
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
