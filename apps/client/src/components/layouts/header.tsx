"use client";
import { useScroll } from "@/hooks/use-scroll";

import { cn } from "@/lib/utils";
import { DesktopNav } from "@/components/layouts/desktop-nav";
import { MobileNav } from "@/components/layouts/mobile-nav";
import UserAccount from "../user-account";
import LanguageSwitcher from "../language-switcher";

export function Header() {
  const scrolled = useScroll(10);

  return (
    <header
      className={cn("sticky top-0 z-50 w-full border-b border-transparent", {
        "border-border bg-background/95 supports-backdrop-filter:bg-background/50 backdrop-blur-sm":
          scrolled,
      })}
    >
      <nav className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-5">
          <a className="rounded-md px-3 py-2.5" href="/">
            <span className="text-primary dancing-script-font text-2xl font-bold">
              Visel Art
            </span>
          </a>
          <DesktopNav />
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          {/* <Button variant="outline">Sign In</Button>
          <Button>Get Started</Button> */}
          <UserAccount />
        </div>
        <MobileNav />
      </nav>
    </header>
  );
}
