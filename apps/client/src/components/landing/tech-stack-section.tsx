"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import {
  Boxes,
  Cpu,
  Database,
  Globe2,
  Layers,
  Palette,
  ShieldCheck,
  Zap,
} from "lucide-react";
import React from "react";

const techStack = [
  {
    name: "Next.js 15",
    category: "Frontend Framework",
    description: "React 19, App Router, Server Components, dynamic SSR",
    icon: Globe2,
    badge: "v16.1 / React 19",
  },
  {
    name: "NestJS",
    category: "Backend Framework",
    description: "Modular enterprise architecture, Swagger OpenAPI, TypeORM",
    icon: Cpu,
    badge: "v11",
  },
  {
    name: "Turborepo",
    category: "Monorepo Pipeline",
    description: "High-speed build caching, task pipelines, pnpm workspaces",
    icon: Boxes,
    badge: "v2.8",
  },
  {
    name: "PostgreSQL & TypeORM",
    category: "Database & Persistence",
    description:
      "Relational persistence with migrations, ACID transactions, pooling",
    icon: Database,
    badge: "Postgres 16",
  },
  {
    name: "TailwindCSS v4",
    category: "Styling Engine",
    description:
      "Modern CSS cascade layers, dark/light theme, typography plugin",
    icon: Palette,
    badge: "v4",
  },
  {
    name: "TanStack Query",
    category: "Data Fetching & Cache",
    description:
      "Declarative queries, automatic invalidation, optimistic updates",
    icon: Layers,
    badge: "v5",
  },
  {
    name: "Zod & Hook Form",
    category: "Validation & Forms",
    description: "Strict schema validation and controlled form performance",
    icon: ShieldCheck,
    badge: "Standard",
  },
  {
    name: "TypeScript",
    category: "Type System",
    description: "End-to-end type safety shared across apps and packages",
    icon: Zap,
    badge: "v5.9",
  },
];

export function TechStackSection() {
  const t = useTranslations("Landing.techStack");

  return (
    <section id="tech-stack" className="bg-muted/20 border-t py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mb-12 space-y-3 text-center">
          <Badge
            variant="outline"
            className="border-primary/20 bg-primary/5 text-primary text-xs font-medium"
          >
            {t("badge")}
          </Badge>
          <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-sm sm:text-base">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {techStack.map((tech) => {
            const Icon = tech.icon;
            return (
              <div
                key={tech.name}
                className="group bg-card hover:border-primary/40 relative rounded-xl border p-5 shadow-xs transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg transition-transform group-hover:scale-105">
                    <Icon className="size-5" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {tech.badge}
                  </Badge>
                </div>
                <div className="mt-4 space-y-1">
                  <h3 className="text-foreground text-base font-semibold">
                    {tech.name}
                  </h3>
                  <p className="text-primary/80 text-xs font-medium">
                    {tech.category}
                  </p>
                  <p className="text-muted-foreground pt-1 text-xs leading-relaxed">
                    {tech.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
