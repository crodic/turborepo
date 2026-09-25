"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PRICING_FAQS } from "@/config/pricing.config";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check,
  Sparkles,
  ShieldCheck,
  Zap,
  Loader2,
  ArrowRight,
  PackageSearch,
} from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  useCreateCheckoutSession,
  usePricingProducts,
} from "@/hooks/use-payment";
import { useProfile } from "@/hooks/use-profile";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { PaymentProduct } from "@/types/payment";

const formatPrice = (price: number, currency = "USD") => {
  const curr = (currency || "USD").toUpperCase();
  if (curr === "VND") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(price);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: curr,
    maximumFractionDigits: 2,
  }).format(price);
};

const getProductDisplayPrice = (product: PaymentProduct, locale: string) => {
  if (product.isFree) {
    return { price: 0, currency: product.currency || "USD", isFree: true };
  }

  const targetCurrency = locale === "vi" ? "vnd" : "usd";
  if (product.prices && product.prices.length > 0) {
    const activePrices = product.prices.filter((p) => !p.isArchived);

    // 1. Try to find active price matching target currency with amount > 0
    const matchedPaid = activePrices.find(
      (p) => p.currency.toLowerCase() === targetCurrency && p.amount > 0
    );
    if (matchedPaid) {
      return {
        price: matchedPaid.amount,
        currency: matchedPaid.currency,
        isFree: false,
      };
    }

    // 2. Try to find any active paid price
    const anyPaid = activePrices.find((p) => p.amount > 0);
    if (anyPaid) {
      return {
        price: anyPaid.amount,
        currency: anyPaid.currency,
        isFree: false,
      };
    }

    // 3. If all active prices are 0
    if (activePrices.length > 0 && activePrices.every((p) => p.amount === 0)) {
      return { price: 0, currency: activePrices[0].currency, isFree: true };
    }
  }

  const isFree = product.isFree || product.price === 0;
  return { price: product.price, currency: product.currency || "USD", isFree };
};

export function PricingView() {
  const t = useTranslations("Pricing");
  const locale = useLocale();
  const [interval, setInterval] = useState<"monthly" | "yearly" | "one_time">(
    "monthly"
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [, startTransition] = useTransition();

  const { data: profile } = useProfile();
  const { data: products, isLoading: isProductsLoading } = usePricingProducts();
  const createCheckoutMutation = useCreateCheckoutSession();
  const router = useRouter();

  // Filter products for currently selected interval
  const currentProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => p.interval === interval);
  }, [products, interval]);

  const handleSelectPlan = (product: PaymentProduct) => {
    const displayPrice = getProductDisplayPrice(product, locale);
    if (product.isFree || displayPrice.isFree) {
      if (profile) {
        startTransition(() => {
          router.push("/profile");
        });
      } else {
        startTransition(() => {
          router.push("/auth/sign-up");
        });
      }
      return;
    }

    setSelectedProductId(String(product.id));
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const successUrl = `${origin}/payment/success?checkout_id={CHECKOUT_ID}`;

    createCheckoutMutation.mutate(
      {
        planSlug: product.planSlug,
        interval,
        successUrl,
        customerEmail: profile?.email,
        customerName: profile?.fullName,
        userId: profile?.id ? String(profile.id) : undefined,
      },
      {
        onSettled: () => {
          setSelectedProductId(null);
        },
      }
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
      {/* Header section */}
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <Badge
          variant="outline"
          className="border-primary/20 bg-primary/5 text-primary px-3 py-1 text-sm font-medium"
        >
          <Sparkles className="mr-1.5 size-3.5" />
          {t("badge")}
        </Badge>
        <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
          {t("subtitle")}
        </p>

        {/* Billing Interval Toggle */}
        <div className="flex items-center justify-center pt-4">
          <div className="bg-muted border-border inline-flex items-center rounded-xl border p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setInterval("monthly")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-all",
                interval === "monthly"
                  ? "bg-background text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("intervals.monthly")}
            </button>
            <button
              type="button"
              onClick={() => setInterval("yearly")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                interval === "yearly"
                  ? "bg-background text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{t("intervals.yearly")}</span>
              <span className="bg-primary/15 text-primary rounded-full px-1.5 py-0.5 text-[11px] font-bold">
                {t("intervals.save20")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setInterval("one_time")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-all",
                interval === "one_time"
                  ? "bg-background text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("intervals.oneTime")}
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid / Empty State */}
      {isProductsLoading ? (
        <div className="mt-12 grid grid-cols-1 items-stretch gap-8 md:grid-cols-3 lg:gap-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="flex flex-col justify-between p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-10 w-1/2" />
                <div className="space-y-2 pt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
              <Skeleton className="mt-8 h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : currentProducts.length === 0 ? (
        <div className="mt-12 flex justify-center">
          <Empty className="border-border/60 bg-card/40 max-w-xl border py-14 shadow-sm backdrop-blur-sm">
            <EmptyMedia
              variant="icon"
              className="bg-primary/10 text-primary size-14 rounded-2xl"
            >
              <PackageSearch className="size-7" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>{t("empty.title")}</EmptyTitle>
              <EmptyDescription>{t("empty.description")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" asChild>
                <Link href="/">{t("empty.backHome")}</Link>
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-1 items-stretch gap-8 md:grid-cols-3 lg:gap-8">
          {currentProducts.map((product) => {
            const isSelected =
              selectedProductId === String(product.id) &&
              createCheckoutMutation.isPending;
            const isYearly = interval === "yearly";
            const displayPrice = getProductDisplayPrice(product, locale);

            // Clean title: remove "(Monthly)", "(Yearly)" etc. for neat card display
            const cleanTitle = product.name
              .replace(/\s*\((Monthly|Yearly|Lifetime|One-time)\)/i, "")
              .trim();

            const isPopular = product.isPopular || product.planSlug === "pro";
            const badgeText =
              product.badge || (isPopular ? t("tiers.pro.badge") : null);

            const fallbackDescription =
              product.description ||
              (product.isFree
                ? t("tiers.starter.description")
                : product.planSlug === "enterprise"
                  ? t("tiers.enterprise.description")
                  : t("tiers.pro.description"));

            const fallbackFeatures =
              product.features && product.features.length > 0
                ? product.features
                : product.isFree
                  ? [
                      t("tiers.starter.features.item1"),
                      t("tiers.starter.features.item2"),
                      t("tiers.starter.features.item3"),
                      t("tiers.starter.features.item4"),
                    ]
                  : product.planSlug === "enterprise"
                    ? [
                        t("tiers.enterprise.features.item1"),
                        t("tiers.enterprise.features.item2"),
                        t("tiers.enterprise.features.item3"),
                        t("tiers.enterprise.features.item4"),
                        t("tiers.enterprise.features.item5"),
                        t("tiers.enterprise.features.item6"),
                      ]
                    : [
                        t("tiers.pro.features.item1"),
                        t("tiers.pro.features.item2"),
                        t("tiers.pro.features.item3"),
                        t("tiers.pro.features.item4"),
                        t("tiers.pro.features.item5"),
                      ];

            const ctaLabel =
              product.ctaText ||
              (product.isFree
                ? t("tiers.starter.cta")
                : product.planSlug === "enterprise"
                  ? t("tiers.enterprise.cta")
                  : t("tiers.pro.cta"));

            return (
              <Card
                key={product.id}
                className={cn(
                  "relative flex flex-col justify-between transition-all duration-300",
                  isPopular
                    ? "border-primary shadow-primary/5 ring-primary bg-card/60 shadow-xl ring-2 backdrop-blur-sm md:-translate-y-2"
                    : "border-border hover:border-border/80 bg-card/40 shadow-md"
                )}
              >
                {badgeText && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1 font-semibold shadow-md">
                      <Sparkles className="mr-1 size-3" />
                      {badgeText}
                    </Badge>
                  </div>
                )}

                <CardHeader className="space-y-2 pb-6">
                  <CardTitle className="text-xl font-bold">
                    {cleanTitle}
                  </CardTitle>
                  <CardDescription className="min-h-10 text-sm">
                    {fallbackDescription}
                  </CardDescription>

                  <div className="flex items-baseline gap-1 pt-4">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {displayPrice.isFree
                        ? t("tiers.starter.free")
                        : formatPrice(
                            displayPrice.price,
                            displayPrice.currency
                          )}
                    </span>
                    {!displayPrice.isFree && (
                      <span className="text-muted-foreground text-sm font-medium">
                        {isYearly
                          ? t("intervals.perYear")
                          : interval === "monthly"
                            ? t("intervals.perMonth")
                            : t("intervals.perLifetime")}
                      </span>
                    )}
                  </div>
                  <div className="h-5 text-xs">
                    {isYearly && !displayPrice.isFree ? (
                      <p className="text-muted-foreground">
                        {t("intervals.billedAnnually", {
                          amount: formatPrice(
                            Math.round(displayPrice.price / 12),
                            displayPrice.currency
                          ),
                        })}
                      </p>
                    ) : interval === "one_time" && !displayPrice.isFree ? (
                      <p className="text-muted-foreground">
                        {t("intervals.payOnce")}
                      </p>
                    ) : displayPrice.isFree ? (
                      <p className="text-muted-foreground">
                        {t("intervals.freeForever")}
                      </p>
                    ) : null}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  <div className="border-border border-t pt-4">
                    <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
                      {t("featuresHeading")}
                    </p>
                    <ul className="space-y-2.5">
                      {fallbackFeatures.map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-sm"
                        >
                          <Check className="text-primary mt-0.5 size-4 shrink-0" />
                          <span className="text-foreground/90">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>

                <CardFooter className="pt-6">
                  <Button
                    className={cn(
                      "w-full font-semibold transition-all",
                      isPopular ? "shadow-primary/20 shadow-md" : ""
                    )}
                    variant={isPopular ? "default" : "outline"}
                    disabled={createCheckoutMutation.isPending}
                    onClick={() => handleSelectPlan(product)}
                  >
                    {isSelected ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        {t("redirecting")}
                      </>
                    ) : (
                      <>
                        {ctaLabel}
                        <ArrowRight className="ml-1.5 size-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Trust & Guarantee Badges */}
      <div className="border-border/80 bg-muted/30 mt-16 grid grid-cols-1 gap-6 rounded-2xl border p-6 text-center sm:grid-cols-3 sm:p-8">
        <div className="flex flex-col items-center space-y-2">
          <div className="bg-primary/10 text-primary rounded-full p-2.5">
            <ShieldCheck className="size-5" />
          </div>
          <h3 className="text-sm font-semibold">{t("trust.secureTitle")}</h3>
          <p className="text-muted-foreground max-w-xs text-xs">
            {t("trust.secureDesc")}
          </p>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <div className="bg-primary/10 text-primary rounded-full p-2.5">
            <Zap className="size-5" />
          </div>
          <h3 className="text-sm font-semibold">{t("trust.instantTitle")}</h3>
          <p className="text-muted-foreground max-w-xs text-xs">
            {t("trust.instantDesc")}
          </p>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <div className="bg-primary/10 text-primary rounded-full p-2.5">
            <Sparkles className="size-5" />
          </div>
          <h3 className="text-sm font-semibold">{t("trust.cancelTitle")}</h3>
          <p className="text-muted-foreground max-w-xs text-xs">
            {t("trust.cancelDesc")}
          </p>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="mx-auto mt-20 max-w-3xl space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("faq.title")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("faq.subtitle")}</p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {PRICING_FAQS.map((faq, idx) => (
            <AccordionItem key={faq.questionKey} value={`item-${idx}`}>
              <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                {t(faq.questionKey as any)}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                {t(faq.answerKey as any)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
