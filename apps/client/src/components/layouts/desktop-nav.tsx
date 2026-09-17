"use client";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { featureLinks, platformLinks } from "@/components/layouts/nav-links";
import { LinkItem } from "@/components/layouts/sheard";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function DesktopNav() {
  const t = useTranslations("Navigation");

  return (
    <NavigationMenu className="hidden md:flex">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent text-sm">
            {t("features")}
          </NavigationMenuTrigger>
          <NavigationMenuContent className="bg-popover text-popover-foreground ring-border/50 p-3 shadow-lg ring-1">
            <div className="grid w-[460px] grid-cols-2 gap-2">
              {featureLinks.map((item) => (
                <LinkItem key={item.label} {...item} />
              ))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent text-sm">
            Platform
          </NavigationMenuTrigger>
          <NavigationMenuContent className="bg-popover text-popover-foreground ring-border/50 p-3 shadow-lg ring-1">
            <div className="grid w-[480px] grid-cols-2 gap-2">
              {platformLinks.map((item) => (
                <LinkItem key={item.label} {...item} />
              ))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link
              href="/#tech-stack"
              className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              {t("techStack")}
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link
              href="/profile"
              className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              {t("profile")}
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
