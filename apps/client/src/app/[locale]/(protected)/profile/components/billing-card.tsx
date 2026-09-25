"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCustomerPortalSession,
  useUserOrders,
  useUserRefundRequests,
  useUserSubscriptions,
} from "@/hooks/use-payment";
import { PaymentOrder } from "@/types/payment";
import { RefundRequestDialog } from "./refund-request-dialog";
import {
  CreditCard,
  ExternalLink,
  Sparkles,
  Loader2,
  Calendar,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Undo2,
} from "lucide-react";
import { format } from "date-fns";

export function BillingCard() {
  const t = useTranslations("Profile.billing");
  const { data: subscriptions, isLoading: isLoadingSubs } =
    useUserSubscriptions();
  const { data: orders, isLoading: isLoadingOrders } = useUserOrders();
  const { data: refundRequests } = useUserRefundRequests();
  const portalMutation = useCustomerPortalSession();

  const [refundDialogOpen, setRefundDialogOpen] = React.useState(false);
  const [selectedOrderForRefund, setSelectedOrderForRefund] =
    React.useState<PaymentOrder | null>(null);

  const activeSub = subscriptions?.find(
    (s) => s.status === "active" || s.status === "trialing"
  );
  const latestSub = activeSub || subscriptions?.[0];

  const handleOpenPortal = () => {
    portalMutation.mutate({
      customerId: latestSub?.polarCustomerId || undefined,
      customerEmail: latestSub?.customerEmail || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="gap-1 border-emerald-500/30 bg-emerald-500/15 font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3" />
            {t("status.active")}
          </Badge>
        );
      case "trialing":
        return (
          <Badge className="gap-1 border-blue-500/30 bg-blue-500/15 font-semibold text-blue-600 dark:text-blue-400">
            <Clock className="size-3" />
            {t("status.trialing")}
          </Badge>
        );
      case "canceled":
        return (
          <Badge
            variant="outline"
            className="text-muted-foreground font-semibold"
          >
            {t("status.canceled")}
          </Badge>
        );
      case "past_due":
        return (
          <Badge variant="destructive" className="gap-1 font-semibold">
            <AlertTriangle className="size-3" />
            {t("status.pastDue")}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="capitalize">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Overview Card */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CreditCard className="text-primary size-5" />
              <CardTitle className="text-xl font-bold">
                {t("planTitle")}
              </CardTitle>
            </div>
            <CardDescription>{t("planDescription")}</CardDescription>
          </div>
          {latestSub && <div>{getStatusBadge(latestSub.status)}</div>}
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {isLoadingSubs ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
          ) : activeSub ? (
            <div className="border-primary/20 bg-primary/5 flex flex-col justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-foreground text-lg font-bold">
                    {activeSub.productTitle ||
                      activeSub.productName ||
                      "Pro Plan"}
                  </h3>
                  <span className="text-muted-foreground text-sm font-semibold">
                    $
                    {activeSub.amount
                      ? (activeSub.amount / 100).toFixed(2)
                      : "19.00"}{" "}
                    /{" "}
                    {activeSub.recurringInterval === "year" ? "year" : "month"}
                  </span>
                </div>
                {activeSub.currentPeriodEnd && (
                  <p className="text-muted-foreground flex items-center gap-1.5 pt-1 text-xs">
                    <Calendar className="size-3.5" />
                    <span>
                      {t("renewsOn")}{" "}
                      <strong className="text-foreground">
                        {format(
                          new Date(activeSub.currentPeriodEnd),
                          "MMMM dd, yyyy"
                        )}
                      </strong>
                    </span>
                  </p>
                )}
              </div>

              <Button
                variant="default"
                size="sm"
                className="shrink-0 gap-1.5 font-semibold"
                disabled={portalMutation.isPending}
                onClick={handleOpenPortal}
              >
                {portalMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    {t("openingPortal")}
                  </>
                ) : (
                  <>
                    {t("manageBilling")}
                    <ExternalLink className="size-3.5" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="border-border bg-muted/40 flex flex-col justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="space-y-1">
                <h3 className="text-foreground text-base font-bold">
                  {t("freeTierTitle")}
                </h3>
                <p className="text-muted-foreground max-w-md text-xs">
                  {t("freeTierDesc")}
                </p>
              </div>
              <Button
                asChild
                size="sm"
                className="shrink-0 gap-1.5 font-semibold"
              >
                <Link href="/pricing">
                  <Sparkles className="size-3.5" />
                  {t("upgradePlan")}
                </Link>
              </Button>
            </div>
          )}
        </CardContent>

        {activeSub && (
          <CardFooter className="border-border/50 text-muted-foreground border-t pt-4 text-xs">
            {t("portalNotice")}
          </CardFooter>
        )}
      </Card>

      {/* Invoices and Order History */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="text-muted-foreground size-5" />
            <CardTitle className="text-lg font-bold">
              {t("historyTitle")}
            </CardTitle>
          </div>
          <CardDescription>{t("historyDescription")}</CardDescription>
        </CardHeader>

        <CardContent>
          {isLoadingOrders ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="border-border overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-xs">
                    <TableHead>{t("table.orderId")}</TableHead>
                    <TableHead>{t("table.date")}</TableHead>
                    <TableHead>{t("table.amount")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead className="text-right">
                      {t("table.receipt")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const refundReq = refundRequests?.find(
                      (r) => String(r.orderId) === String(order.id)
                    );
                    const isWithin14Days =
                      (Date.now() - new Date(order.createdAt).getTime()) /
                        (1000 * 60 * 60 * 24) <=
                      14;
                    const canRequestRefund =
                      order.status === "paid" && !refundReq && isWithin14Days;

                    return (
                      <TableRow key={order.id} className="text-xs">
                        <TableCell className="text-muted-foreground font-mono">
                          {order.orderNumber ||
                            order.orderId ||
                            String(order.id)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-foreground font-semibold">
                          ${((order.amount || 0) / 100).toFixed(2)}{" "}
                          {order.currency?.toUpperCase() || "USD"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant={
                                order.status === "paid"
                                  ? "secondary"
                                  : order.status === "refunded"
                                    ? "destructive"
                                    : "outline"
                              }
                              className="text-[11px] capitalize"
                            >
                              {order.status}
                            </Badge>

                            {refundReq?.status === "pending" && (
                              <Badge
                                variant="outline"
                                className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400"
                              >
                                {t("table.refundPending")}
                              </Badge>
                            )}
                            {refundReq?.status === "rejected" && (
                              <Badge
                                variant="outline"
                                className="border-rose-500/30 bg-rose-500/10 text-[10px] text-rose-600 dark:text-rose-400"
                              >
                                {t("table.refundRejected")}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {order.receiptUrl || order.invoiceUrl ? (
                              <a
                                href={
                                  order.receiptUrl || order.invoiceUrl || "#"
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary inline-flex items-center gap-1 font-medium hover:underline"
                              >
                                <span>{t("table.viewReceipt")}</span>
                                <ExternalLink className="size-3" />
                              </a>
                            ) : null}

                            {canRequestRefund && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground h-7 gap-1 px-2 text-xs"
                                onClick={() => {
                                  setSelectedOrderForRefund(order);
                                  setRefundDialogOpen(true);
                                }}
                              >
                                <Undo2 className="size-3" />
                                <span>{t("table.requestRefund")}</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-muted-foreground py-8 text-center text-sm">
              {t("noOrders")}
            </div>
          )}
        </CardContent>
      </Card>

      <RefundRequestDialog
        order={selectedOrderForRefund}
        open={refundDialogOpen}
        onOpenChange={setRefundDialogOpen}
      />
    </div>
  );
}
