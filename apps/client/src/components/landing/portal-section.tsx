"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  LayoutDashboard,
  ShieldCheck,
  Sliders,
  Users,
} from "lucide-react";
import React from "react";

export function PortalSection() {
  const t = useTranslations("Landing.portal");
  const portalUrl =
    process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL || "http://localhost:5173";

  const portalFeatures = [
    {
      key: "users",
      icon: Users,
      badge: "Core Admin",
    },
    {
      key: "rbac",
      icon: ShieldCheck,
      badge: "CASL Permissions",
    },
    {
      key: "whiteLabel",
      icon: Sliders,
      badge: "Customization",
    },
    {
      key: "audit",
      icon: Activity,
      badge: "Compliance",
    },
  ] as const;

  return (
    <section id="portal" className="bg-muted/10 border-t py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Column: Intro & Features */}
          <div className="space-y-8 lg:col-span-6">
            <div className="space-y-3">
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/5 text-primary text-xs font-medium"
              >
                <LayoutDashboard className="mr-1.5 size-3.5" />
                {t("badge")}
              </Badge>
              <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                {t("title")}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
                {t("subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {portalFeatures.map(({ key, icon: Icon, badge }) => (
                <div
                  key={key}
                  className="bg-card hover:border-primary/40 group relative rounded-xl border p-4 shadow-2xs transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg transition-transform group-hover:scale-105">
                      <Icon className="size-4.5" />
                    </div>
                    <span className="text-muted-foreground/80 text-[10px] font-medium tracking-wider uppercase">
                      {badge}
                    </span>
                  </div>
                  <h3 className="text-foreground mt-3 text-sm font-semibold tracking-tight">
                    {t(`features.${key}.title`)}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {t(`features.${key}.description`)}
                  </p>
                </div>
              ))}
            </div>

            <div>
              <Button asChild size="lg" className="gap-2">
                <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                  <span>{t("openPortal")}</span>
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Right Column: Interactive UI Mockup */}
          <div className="lg:col-span-6">
            <div className="bg-card relative mx-auto w-full max-w-lg overflow-hidden rounded-2xl border shadow-xl">
              {/* Window Header */}
              <div className="bg-muted/40 flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-red-500/80" />
                  <div className="size-3 rounded-full bg-yellow-500/80" />
                  <div className="size-3 rounded-full bg-green-500/80" />
                  <span className="text-muted-foreground ml-2 font-mono text-xs">
                    localhost:5173
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  <span>{t("preview.systemOnline")}</span>
                </div>
              </div>

              {/* Window Content */}
              <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-semibold tracking-tight">
                      {t("preview.title")}
                    </h4>
                    <p className="text-muted-foreground text-xs">
                      Vite + React 18 / TanStack Table / CASL
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    v1.0.0
                  </Badge>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="bg-muted/20 rounded-lg border p-3">
                    <p className="text-muted-foreground text-[11px]">
                      {t("preview.stats.totalUsers")}
                    </p>
                    <p className="mt-1 text-lg font-bold">1,248</p>
                  </div>
                  <div className="bg-muted/20 rounded-lg border p-3">
                    <p className="text-muted-foreground text-[11px]">
                      {t("preview.stats.activeAdmins")}
                    </p>
                    <p className="mt-1 text-lg font-bold">6</p>
                  </div>
                  <div className="bg-muted/20 rounded-lg border p-3">
                    <p className="text-muted-foreground text-[11px]">
                      {t("preview.stats.auditEvents")}
                    </p>
                    <p className="mt-1 text-lg font-bold">8.4k</p>
                  </div>
                  <div className="bg-muted/20 rounded-lg border p-3">
                    <p className="text-muted-foreground text-[11px]">
                      {t("preview.stats.systemHealth")}
                    </p>
                    <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      99.9%
                    </p>
                  </div>
                </div>

                {/* Mock Data Table */}
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs font-medium">
                    {t("preview.recentUsersTitle")}
                  </p>
                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground border-b">
                        <tr>
                          <th className="px-3 py-2 font-medium">User</th>
                          <th className="px-3 py-2 font-medium">Role</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="px-3 py-2.5 font-medium">
                            Alex Nguyen
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge variant="outline" className="text-[10px]">
                              {t("preview.roleAdmin")}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              {t("preview.statusActive")}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2.5 font-medium">
                            Sarah Connor
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge variant="outline" className="text-[10px]">
                              {t("preview.roleMember")}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              {t("preview.statusVerified")}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2.5 font-medium">
                            Michael Scott
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge variant="outline" className="text-[10px]">
                              {t("preview.roleMember")}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              {t("preview.statusActive")}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
