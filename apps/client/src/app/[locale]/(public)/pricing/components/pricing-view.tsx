"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
} from "lucide-react";
import {
  useCreateCheckoutSession,
  usePricingProducts,
} from "@/hooks/use-payment";
import { useProfile } from "@/hooks/use-profile";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { PaymentProduct } from "@/types/payment";

export function PricingView() {
  const t = useTranslations("Pricing");
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
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
    if (product.isFree) {
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
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="mt-12 grid grid-cols-1 items-stretch gap-8 md:grid-cols-3 lg:gap-8">
        {isProductsLoading ? (
          <>
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
          </>
        ) : (
          currentProducts.map((product) => {
            const isSelected =
              selectedProductId === String(product.id) &&
              createCheckoutMutation.isPending;
            const isYearly = interval === "yearly";

            return (
              <Card
                key={product.id}
                className={cn(
                  "relative flex flex-col justify-between transition-all duration-300",
                  product.isPopular
                    ? "border-primary shadow-primary/5 ring-primary bg-card/60 shadow-xl ring-2 backdrop-blur-sm md:-translate-y-2"
                    : "border-border hover:border-border/80 bg-card/40 shadow-md"
                )}
              >
                {product.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1 font-semibold shadow-md">
                      <Sparkles className="mr-1 size-3" />
                      {product.badge || t("tiers.pro.badge")}
                    </Badge>
                  </div>
                )}

                <CardHeader className="space-y-2 pb-6">
                  <CardTitle className="text-xl font-bold">
                    {product.name}
                  </CardTitle>
                  <CardDescription className="min-h-10 text-sm">
                    {product.description || ""}
                  </CardDescription>

                  <div className="flex items-baseline gap-1 pt-4">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {product.isFree
                        ? t("tiers.starter.free")
                        : `$${product.price}`}
                    </span>
                    {!product.isFree && (
                      <span className="text-muted-foreground text-sm font-medium">
                        {isYearly
                          ? t("intervals.perYear")
                          : t("intervals.perMonth")}
                      </span>
                    )}
                  </div>
                  {isYearly && !product.isFree && (
                    <p className="text-muted-foreground text-xs">
                      {t("intervals.billedAnnually", {
                        amount: String(Math.round(product.price / 12)),
                      })}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  <div className="border-border border-t pt-4">
                    <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
                      {t("featuresHeading")}
                    </p>
                    <ul className="space-y-2.5">
                      {(product.features || []).map((feature, idx) => (
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
                      product.isPopular ? "shadow-primary/20 shadow-md" : ""
                    )}
                    variant={product.isPopular ? "default" : "outline"}
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
                        {product.ctaText ||
                          (product.isFree
                            ? t("tiers.starter.cta")
                            : t("tiers.pro.cta"))}
                        <ArrowRight className="ml-1.5 size-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

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
