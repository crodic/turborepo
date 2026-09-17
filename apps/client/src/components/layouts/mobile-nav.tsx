"use client";

import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { featureLinks, platformLinks } from "@/components/layouts/nav-links";
import { LinkItem } from "@/components/layouts/sheard";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { MenuIcon, XIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { isMobile } = useMediaQuery();
  const t = useTranslations("Navigation");

  useEffect(() => {
    if (open && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, isMobile]);

  return (
    <>
      <Button
        aria-controls="mobile-menu"
        aria-expanded={open}
        aria-label="Toggle menu"
        className="md:hidden"
        onClick={() => setOpen(!open)}
        size="icon"
        variant="outline"
      >
        <div
          className={cn(
            "transition-all",
            open ? "scale-100 opacity-100" : "scale-0 opacity-0"
          )}
        >
          <XIcon aria-hidden="true" className="size-4.5" />
        </div>
        <div
          className={cn(
            "absolute transition-all",
            open ? "scale-0 opacity-0" : "scale-100 opacity-100"
          )}
        >
          <MenuIcon aria-hidden="true" className="size-4.5" />
        </div>
      </Button>

      {open &&
        createPortal(
          <div
            className={cn(
              "bg-background/95 supports-backdrop-filter:bg-background/80 backdrop-blur-md",
              "fixed top-14 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-t md:hidden"
            )}
            id="mobile-menu"
          >
            <div
              className={cn(
                "data-[slot=open]:zoom-in-97 data-[slot=open]:animate-in ease-out",
                "size-full overflow-x-hidden overflow-y-auto p-5"
              )}
              data-slot={open ? "open" : "closed"}
            >
              <div className="flex w-full flex-col gap-y-4">
                <div>
                  <span className="text-muted-foreground px-2 text-xs font-semibold tracking-wider uppercase">
                    {t("features")}
                  </span>
                  <div className="mt-2 flex flex-col gap-1">
                    {featureLinks.map((link) => (
                      <LinkItem
                        key={`product-${link.label}`}
                        {...link}
                        onClick={() => setOpen(false)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground px-2 text-xs font-semibold tracking-wider uppercase">
                    Platform
                  </span>
                  <div className="mt-2 flex flex-col gap-1">
                    {platformLinks.map((link) => (
                      <LinkItem
                        key={`company-${link.label}`}
                        {...link}
                        onClick={() => setOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2 border-t pt-4">
                <Button
                  className="w-full"
                  variant="outline"
                  asChild
                  onClick={() => setOpen(false)}
                >
                  <Link href="/auth/login">{t("signIn")}</Link>
                </Button>
                <Button
                  className="w-full"
                  asChild
                  onClick={() => setOpen(false)}
                >
                  <Link href="/auth/sign-up">{t("signUp")}</Link>
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
