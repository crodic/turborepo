import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { WhiteLabelLogo } from "@/lib/white-label";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import React from "react";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("Auth.layout");

  return (
    <section className={cn("min-h-screen w-full")}>
      <div className="grid min-h-screen lg:grid-cols-2">
        <div
          className={cn(
            "relative hidden flex-col justify-between overflow-hidden p-10 lg:flex",
            "bg-accent text-white"
          )}
        >
          <Image
            src="/crodic-auth.jpg"
            alt="Crodic Framework"
            fill
            priority
            className="object-cover"
          />

          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
          <Link href="/" className="relative z-10 flex items-center gap-2">
            <WhiteLabelLogo
              fallback={
                <span className="text-primary text-2xl font-bold tracking-tight">
                  Crodic Framework
                </span>
              }
            />
          </Link>
          <div className="relative z-10 max-w-md">
            <p className="text-muted dark:text-muted-foreground mb-2 text-sm">
              {t("welcome")}
            </p>
            <h2 className="text-3xl leading-tight font-semibold tracking-tight md:text-4xl">
              {t("tagline")}
            </h2>
          </div>
        </div>

        {/* Right Side - Form */}
        {children}
      </div>
    </section>
  );
}
