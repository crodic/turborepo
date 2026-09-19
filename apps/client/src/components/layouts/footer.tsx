"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useWhiteLabel, WhiteLabelLogo } from "@/lib/white-label";
import { useTranslations } from "next-intl";
import { Github, Layers, Twitter } from "lucide-react";
import React from "react";

export function Footer() {
  const t = useTranslations("Footer");
  const { whiteLabel, isEnabled } = useWhiteLabel();

  const copyrightText =
    (isEnabled && whiteLabel?.copyrightText) ||
    `© ${new Date().getFullYear()} Visel Art. ${t("allRightsReserved")}`;

  return (
    <footer className="bg-card/40 border-t">
      <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <Link className="inline-flex items-center gap-2" href="/">
              <WhiteLabelLogo
                fallback={
                  <span className="text-primary dancing-script-font text-2xl font-bold">
                    Visel Art
                  </span>
                }
              />
            </Link>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t("about")}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Button asChild size="icon" variant="outline" className="size-8">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                >
                  <Github className="size-4" />
                </a>
              </Button>
              <Button asChild size="icon" variant="outline" className="size-8">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                >
                  <Twitter className="size-4" />
                </a>
              </Button>
              <Button asChild size="icon" variant="outline" className="size-8">
                <a
                  href="https://turborepo.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Turborepo"
                >
                  <Layers className="size-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Product Col */}
          <div>
            <h3 className="text-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
              {t("product")}
            </h3>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>
                <Link
                  className="hover:text-foreground transition-colors"
                  href="/#features"
                >
                  {t("features")}
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-foreground transition-colors"
                  href="/#tech-stack"
                >
                  {t("techStack")}
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-foreground transition-colors"
                  href="/profile"
                >
                  {t("profile")}
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-foreground transition-colors"
                  href="/auth/login"
                >
                  {t("auth")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Col */}
          <div>
            <h3 className="text-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
              {t("resources")}
            </h3>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>
                <a
                  className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
                  href="https://turbo.build/repo/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("documentation")}
                </a>
              </li>
              <li>
                <a
                  className="hover:text-foreground transition-colors"
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("github")}
                </a>
              </li>
              <li>
                <a
                  className="hover:text-foreground transition-colors"
                  href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("apiDocs")}
                </a>
              </li>
              <li>
                <a
                  className="hover:text-foreground transition-colors"
                  href="https://nextjs.org/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Next.js 15
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Col */}
          <div>
            <h3 className="text-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
              {t("legal")}
            </h3>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>
                <Link
                  className="hover:text-foreground transition-colors"
                  href="/pages/privacy-policy"
                >
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-foreground transition-colors"
                  href="/pages/terms-of-service"
                >
                  {t("terms")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-border mt-10 h-px" />

        <div className="text-muted-foreground flex flex-col items-center justify-between gap-3 pt-6 text-xs sm:flex-row">
          <p>{copyrightText}</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
