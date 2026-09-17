"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import {
  Boxes,
  CheckCheck,
  Globe,
  Layers,
  Lock,
  Palette,
  Sparkles,
} from "lucide-react";
import React from "react";

export function FeaturesSection() {
  const t = useTranslations("Landing.features");

  const features = [
    {
      key: "monorepo",
      icon: Boxes,
      badge: "Architecture",
    },
    {
      key: "auth",
      icon: Lock,
      badge: "Security",
    },
    {
      key: "forms",
      icon: CheckCheck,
      badge: "Type Safety",
    },
    {
      key: "query",
      icon: Layers,
      badge: "Performance",
    },
    {
      key: "i18n",
      icon: Globe,
      badge: "Localization",
    },
    {
      key: "design",
      icon: Palette,
      badge: "UI / UX",
    },
  ] as const;

  return (
    <section id="features" className="border-t py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mb-16 space-y-3 text-center">
          <Badge
            variant="outline"
            className="border-primary/20 bg-primary/5 text-primary text-xs font-medium"
          >
            {t("badge")}
          </Badge>
          <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {t("title")}
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-sm sm:text-base">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ key, icon: Icon, badge }) => (
            <div
              key={key}
              className="group bg-card hover:border-primary/40 relative flex flex-col justify-between rounded-2xl border p-6 shadow-xs transition-all hover:shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110">
                    <Icon className="size-6" />
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[11px] font-medium"
                  >
                    {badge}
                  </Badge>
                </div>

                <div className="mt-5 space-y-2">
                  <h3 className="text-foreground text-lg font-semibold tracking-tight">
                    {t(`items.${key}.title`)}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t(`items.${key}.description`)}
                  </p>
                </div>
              </div>

              <div className="text-primary mt-6 flex items-center gap-1.5 text-xs font-medium">
                <Sparkles className="size-3.5" />
                <span>Production Ready</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
