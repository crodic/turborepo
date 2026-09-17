"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, Github, Sparkles } from "lucide-react";
import React from "react";

export function CtaSection() {
  const t = useTranslations("Landing.cta");

  return (
    <section className="from-card to-background relative overflow-hidden border-t bg-linear-to-b py-20 md:py-28">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="bg-primary/10 size-96 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl px-4 lg:px-6">
        <div className="border-primary/20 bg-primary/5 relative rounded-3xl border px-6 py-12 text-center shadow-xl sm:px-12 sm:py-16 md:py-20">
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 text-primary mb-4 gap-1.5 px-3 py-1 text-xs"
          >
            <Sparkles className="size-3.5" />
            <span>{t("badge")}</span>
          </Badge>

          <h2 className="text-foreground mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h2>

          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm leading-relaxed sm:text-base">
            {t("subtitle")}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="shadow-primary/25 gap-2 shadow-lg"
              asChild
            >
              <Link href="/auth/sign-up">
                <span>{t("button")}</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="size-4" />
                <span>{t("github")}</span>
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
