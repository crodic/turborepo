"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { useCreateRefundRequest } from "@/hooks/use-payment";
import { PaymentOrder } from "@/types/payment";

interface RefundRequestDialogProps {
  order: PaymentOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RefundRequestDialog({
  order,
  open,
  onOpenChange,
}: RefundRequestDialogProps) {
  const t = useTranslations("Profile.billing.refundDialog");
  const refundMutation = useCreateRefundRequest();

  const refundSchema = z.object({
    reason: z.string().min(1, t("validation.reasonRequired")),
    customerNote: z.string().max(500, t("validation.noteTooLong")).optional(),
  });

  type RefundFormValues = z.infer<typeof refundSchema>;

  const form = useForm<RefundFormValues>({
    resolver: zodResolver(refundSchema),
    defaultValues: {
      reason: "satisfaction_guarantee",
      customerNote: "",
    },
  });

  const onSubmit = (values: RefundFormValues) => {
    if (!order) return;

    refundMutation.mutate(
      {
        orderId: order.id,
        data: {
          reason: values.reason,
          customerNote: values.customerNote,
        },
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      }
    );
  };

  const refundReasons = [
    {
      value: "satisfaction_guarantee",
      label: t("reasons.satisfactionGuarantee"),
    },
    { value: "service_disruption", label: t("reasons.serviceDisruption") },
    { value: "duplicate", label: t("reasons.duplicate") },
    { value: "customer_request", label: t("reasons.customerRequest") },
    { value: "other", label: t("reasons.other") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", {
              orderNumber: String(order?.orderNumber || order?.id || ""),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
          <AlertCircle className="size-4 shrink-0 translate-y-0.5 text-amber-600 dark:text-amber-400" />
          <p>{t("policyNotice")}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("reasonLabel")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("reasonPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {refundReasons.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("noteLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("notePlaceholder")}
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t("noteDescription")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={refundMutation.isPending}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={refundMutation.isPending}>
                {refundMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t("submitting")}
                  </>
                ) : (
                  t("submit")
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
