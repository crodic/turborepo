"use client";

import { LogOut, Shield, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile, useSignOut } from "@/hooks/use-profile";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import React from "react";

export default function UserAccount() {
  const { data: profile, isLoading } = useProfile();
  const signOutMutation = useSignOut();
  const t = useTranslations("Navigation");
  const tProfile = useTranslations("Profile");

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/auth/login">{t("signIn")}</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/auth/sign-up">{t("signUp")}</Link>
        </Button>
      </div>
    );
  }

  const initials =
    (
      (profile.firstName?.[0] || "") + (profile.lastName?.[0] || "")
    ).toUpperCase() ||
    profile.email?.slice(0, 2).toUpperCase() ||
    "U";

  const handleSignOut = () => {
    signOutMutation.mutate();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="border-border/50 relative size-9 rounded-full border p-0"
          variant="ghost"
        >
          <Avatar className="size-9">
            {profile.avatar && (
              <AvatarImage src={profile.avatar} alt={profile.fullName} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="ring-background absolute right-0 bottom-0 size-2.5 rounded-full bg-emerald-500 ring-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              {profile.avatar && (
                <AvatarImage src={profile.avatar} alt={profile.fullName} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1 overflow-hidden">
              <p className="truncate text-sm leading-none font-medium">
                {profile.fullName || profile.email}
              </p>
              <p className="text-muted-foreground truncate text-xs leading-none">
                {profile.email}
              </p>
              <Badge
                className="w-fit px-1.5 py-0 text-[10px]"
                variant="secondary"
              >
                {tProfile("role")}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <User className="mr-2 size-4" />
            <span>{t("profile")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile?tab=security" className="cursor-pointer">
            <Shield className="mr-2 size-4" />
            <span>{t("accountSettings")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={handleSignOut}
          className="cursor-pointer"
          disabled={signOutMutation.isPending}
        >
          <LogOut className="mr-2 size-4" />
          <span>{signOutMutation.isPending ? "..." : t("logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
