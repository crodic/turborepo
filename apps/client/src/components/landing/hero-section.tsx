"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, Github, Lock, Sparkles } from "lucide-react";
import React from "react";

export function HeroSection() {
  const t = useTranslations("Landing.hero");

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
      {/* Background glowing gradients */}
      <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div className="from-primary/30 relative left-[calc(50%-11rem)] aspect-1155/678 w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr to-violet-500/20 opacity-40 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="flex flex-col items-center space-y-6 text-center">
          {/* Eyebrow badge */}
          <Badge
            variant="outline"
            className="border-primary/20 bg-primary/5 text-primary gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium shadow-2xs"
          >
            <Sparkles className="size-3.5" />
            <span>{t("badge")}</span>
          </Badge>

          {/* Main Headline */}
          <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="text-foreground block">{t("title")}</span>
          </h1>

          {/* Subtitle */}
          <p className="text-muted-foreground max-w-2xl text-base leading-relaxed sm:text-lg md:text-xl">
            {t("subtitle")}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button
              size="lg"
              className="shadow-primary/20 gap-2 shadow-md"
              asChild
            >
              <Link href="/auth/sign-up">
                <span>{t("getStarted")}</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <Link href="/profile">
                <Lock className="size-4" />
                <span>{t("exploreProfile")}</span>
              </Link>
            </Button>
            <Button size="lg" variant="ghost" className="gap-2" asChild>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="size-4" />
                <span>{t("viewGithub")}</span>
              </a>
            </Button>
          </div>

          {/* Quick Monorepo Highlights Bar */}
          <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-8 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>Next.js 15 App Router</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>NestJS + TypeORM PostgreSQL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>Turborepo & pnpm Workspaces</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>React Hook Form + Zod</span>
            </div>
          </div>

          {/* Terminal / Code Mockup preview */}
          <div className="w-full max-w-4xl pt-8">
            <div className="bg-card/60 relative rounded-xl border p-2 shadow-2xl backdrop-blur-md">
              <div className="border-border/40 text-muted-foreground flex items-center gap-2 border-b px-3 py-2 text-xs">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-red-500/80" />
                  <div className="size-3 rounded-full bg-yellow-500/80" />
                  <div className="size-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="ml-2 font-mono">
                  turborepo-monorepo — bash
                </span>
              </div>
              <div className="overflow-x-auto p-4 text-left font-mono text-xs leading-relaxed sm:text-sm">
                <div className="text-muted-foreground">
                  <span className="font-semibold text-emerald-500">$</span> pnpm
                  dev
                </div>
                <div className="text-foreground/80 mt-2 space-y-1">
                  <p className="font-semibold text-blue-500">
                    [turbo] Running tasks across 3 workspaces...
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-violet-400">
                      apps/api:
                    </span>{" "}
                    NestJS server listening on http://localhost:3001/api/docs
                    (Swagger ready)
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-emerald-400">
                      apps/client:
                    </span>{" "}
                    Next.js 15 app listening on http://localhost:3000 (App
                    Router + i18n)
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-amber-400">
                      apps/web:
                    </span>{" "}
                    Vite admin portal listening on http://localhost:5173
                  </p>
                  <p className="pt-1 text-emerald-500">
                    ✓ All pipelines compiled with Remote Caching enabled
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
