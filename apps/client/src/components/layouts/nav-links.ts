import {
  Boxes,
  Code2,
  CreditCard,
  FileCode2,
  Layers,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import type { LinkItemType } from "@/components/layouts/sheard";

export const featureLinks: LinkItemType[] = [
  {
    label: "Monorepo Architecture",
    href: "/#features",
    description: "Turborepo + pnpm workspace orchestration",
    icon: Boxes,
  },
  {
    label: "Authentication & OAuth",
    href: "/#features",
    description: "JWT, Refresh tokens & Google OAuth",
    icon: LockKeyhole,
  },
  {
    label: "Type-Safe Forms",
    href: "/#features",
    description: "React Hook Form + Zod validation",
    icon: ShieldCheck,
  },
  {
    label: "TanStack React Query",
    href: "/#features",
    description: "Client-side caching & mutations",
    icon: Layers,
  },
];

export const platformLinks: LinkItemType[] = [
  {
    label: "Account Profile",
    href: "/profile",
    description: "Personal details and account status",
    icon: User,
  },
  {
    label: "Security & Credentials",
    href: "/profile?tab=security",
    description: "Password configuration & connected accounts",
    icon: Code2,
  },
  {
    label: "Subscription & Billing",
    href: "/profile?tab=billing",
    description: "Manage plans, invoices & payment methods",
    icon: CreditCard,
  },
  {
    label: "Design System",
    href: "/#tech-stack",
    description: "TailwindCSS v4 & Radix UI primitives",
    icon: Sparkles,
  },
  {
    label: "NestJS Backend API",
    href: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/docs`,
    description: "OpenAPI / Swagger interactive documentation",
    icon: FileCode2,
  },
];
