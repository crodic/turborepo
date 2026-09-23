"use client";

import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { featureLinks, platformLinks } from "@/components/layouts/nav-links";
import { LinkItem } from "@/components/layouts/sheard";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { LogOut, MenuIcon, User, XIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useProfile, useSignOut } from "@/hooks/use-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { isMobile } = useMediaQuery();
  const { data: profile } = useProfile();
  const signOutMutation = useSignOut();
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

  const initials =
    (
      (profile?.firstName?.[0] || "") + (profile?.lastName?.[0] || "")
    ).toUpperCase() ||
    profile?.email?.slice(0, 2).toUpperCase() ||
    "U";

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
                {profile ? (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setOpen(false)}
                      className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
                    >
                      <Avatar className="size-10">
                        {profile.avatar && (
                          <AvatarImage
                            src={profile.avatar}
                            alt={profile.fullName}
                          />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-0.5 overflow-hidden">
                        <span className="truncate text-sm font-medium">
                          {profile.fullName || profile.email}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {profile.email}
                        </span>
                      </div>
                    </Link>

                    <Button
                      className="w-full justify-start gap-2"
                      variant="outline"
                      asChild
                      onClick={() => setOpen(false)}
                    >
                      <Link href="/profile">
                        <User className="size-4" />
                        <span>{t("profile")}</span>
                      </Link>
                    </Button>

                    <Button
                      className="text-destructive hover:text-destructive w-full justify-start gap-2"
                      variant="outline"
                      onClick={() => {
                        setOpen(false);
                        signOutMutation.mutate();
                      }}
                      disabled={signOutMutation.isPending}
                    >
                      <LogOut className="size-4" />
                      <span>{t("logout")}</span>
                    </Button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
