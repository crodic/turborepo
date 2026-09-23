"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, ArrowRight, Home, CreditCard } from "lucide-react";

export function PaymentSuccessView() {
  const t = useTranslations("PaymentSuccess");
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get("checkout_id");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-24">
      <Card className="border-border/80 bg-card/60 w-full text-center shadow-2xl backdrop-blur-md">
        <CardHeader className="flex flex-col items-center space-y-4 pt-8 pb-4">
          <div className="bg-primary/10 text-primary ring-primary/5 animate-in fade-in zoom-in relative flex size-20 items-center justify-center rounded-full ring-8 duration-500">
            <CheckCircle2 className="size-10" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("title")}
            </CardTitle>
            <p className="text-muted-foreground mx-auto max-w-md text-sm">
              {t("subtitle")}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-6 pb-6">
          {checkoutId && (
            <div className="bg-muted/50 text-muted-foreground border-border/50 rounded-lg border p-3 text-xs">
              <span className="text-foreground font-semibold">
                {t("referenceId")}:{" "}
              </span>
              <code className="font-mono">{checkoutId}</code>
            </div>
          )}

          <div className="border-primary/20 bg-primary/5 space-y-2 rounded-xl border p-4 text-left">
            <h4 className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="text-primary size-4" />
              {t("whatsNextTitle")}
            </h4>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t("whatsNextDesc")}
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col justify-center gap-3 px-6 pt-2 pb-8 sm:flex-row">
          <Button asChild className="w-full font-semibold sm:w-auto">
            <Link href="/profile?tab=billing">
              {t("viewBilling")}
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/">
              <Home className="mr-1.5 size-4" />
              {t("returnHome")}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
