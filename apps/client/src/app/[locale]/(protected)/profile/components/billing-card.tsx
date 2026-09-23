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
  useUserSubscriptions,
} from "@/hooks/use-payment";
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
} from "lucide-react";
import { format } from "date-fns";

export function BillingCard() {
  const t = useTranslations("Profile.billing");
  const { data: subscriptions, isLoading: isLoadingSubs } =
    useUserSubscriptions();
  const { data: orders, isLoading: isLoadingOrders } = useUserOrders();
  const portalMutation = useCustomerPortalSession();

  const activeSub = subscriptions?.find(
    (s) => s.status === "active" || s.status === "trialing"
  );
  const latestSub = activeSub || subscriptions?.[0];

  const handleOpenPortal = () => {
    portalMutation.mutate();
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
                    {activeSub.productName || "Pro Plan"}
                  </h3>
                  <span className="text-muted-foreground text-sm font-semibold">
                    ${activeSub.amount} /{" "}
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
                  {orders.map((order) => (
                    <TableRow key={order.id} className="text-xs">
                      <TableCell className="text-muted-foreground font-mono">
                        {order.orderId
                          ? `${order.orderId.slice(0, 8)}...`
                          : order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.createdAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-foreground font-semibold">
                        ${order.amount} {order.currency.toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === "paid" ? "secondary" : "outline"
                          }
                          className="text-[11px] capitalize"
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {order.receiptUrl || order.invoiceUrl ? (
                          <a
                            href={order.receiptUrl || order.invoiceUrl || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary inline-flex items-center gap-1 font-medium hover:underline"
                          >
                            <span>{t("table.viewReceipt")}</span>
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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
    </div>
  );
}
