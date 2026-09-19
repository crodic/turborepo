"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "@/types/apis";
import { useFormatter, useTranslations } from "next-intl";
import { CalendarIcon, CheckCircle2, ShieldAlert } from "lucide-react";
import React from "react";

interface ProfileHeaderProps {
  profile: User | null | undefined;
  isLoading: boolean;
}

export function ProfileHeader({ profile, isLoading }: ProfileHeaderProps) {
  const t = useTranslations("Profile");
  const format = useFormatter();

  if (isLoading) {
    return (
      <div className="bg-card flex flex-col gap-4 rounded-xl border p-6 shadow-xs sm:flex-row sm:items-center sm:gap-6">
        <Skeleton className="size-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const initials =
    (
      (profile.firstName?.[0] || "") + (profile.lastName?.[0] || "")
    ).toUpperCase() ||
    profile.email?.slice(0, 2).toUpperCase() ||
    "U";

  const memberSinceFormatted = profile.createdAt
    ? format.dateTime(new Date(profile.createdAt), {
        year: "numeric",
        month: "long",
      })
    : null;

  return (
    <div className="bg-card flex flex-col gap-5 rounded-xl border p-6 shadow-xs sm:flex-row sm:items-center sm:gap-6">
      <div className="relative">
        <Avatar className="border-background ring-border size-20 border-2 ring-2">
          {profile.avatar && (
            <AvatarImage src={profile.avatar} alt={profile.fullName} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={`border-background absolute right-0 bottom-0 size-4 rounded-full border-2 ${
            profile.verifiedAt ? "bg-emerald-500" : "bg-amber-500"
          }`}
          title={profile.verifiedAt ? t("verified") : t("unverified")}
        />
      </div>

      <div className="flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            {profile.fullName || profile.email}
          </h1>
          <Badge variant="secondary" className="text-xs font-normal">
            {t("role")}
          </Badge>
          {profile.verifiedAt ? (
            <Badge
              variant="outline"
              className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="size-3" />
              {t("verified")}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1 border-amber-500/30 bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400"
            >
              <ShieldAlert className="size-3" />
              {t("unverified")}
            </Badge>
          )}
        </div>

        <p className="text-muted-foreground text-sm">{profile.email}</p>

        {memberSinceFormatted && (
          <div className="text-muted-foreground flex items-center gap-1.5 pt-1 text-xs">
            <CalendarIcon className="size-3.5" />
            <span>
              {t("memberSince")} {memberSinceFormatted}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
