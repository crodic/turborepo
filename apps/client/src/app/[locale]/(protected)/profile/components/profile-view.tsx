"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile } from "@/hooks/use-profile";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { AlertCircle, Lock, UserCircle } from "lucide-react";
import { ChangePasswordForm } from "./change-password-form";
import { GeneralInfoForm } from "./general-info-form";
import { ProfileHeader } from "./profile-header";
import { SessionCard } from "./session-card";
import { SetupPasswordForm } from "./setup-password-form";
import { SocialAccountsCard } from "./social-accounts-card";

export function ProfileView() {
  const t = useTranslations("Profile");
  const { data: profile, isLoading, isError, refetch } = useProfile();
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentTab =
    searchParams.get("tab") === "security" ? "security" : "general";

  const handleTabChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (value === "general") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", value);
    }
    const query = nextParams.toString();
    router.replace(query ? `/profile?${query}` : "/profile");
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <ProfileHeader profile={undefined} isLoading={true} />
        <div className="space-y-4">
          <Skeleton className="h-10 w-72 rounded-lg" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-3">
            <span>{t("errorLoading")}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void refetch()}
              >
                Retry
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/login">Sign in</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <ProfileHeader profile={profile} isLoading={false} />

      <Tabs
        value={currentTab}
        onValueChange={handleTabChange}
        className="w-full space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
          <TabsTrigger value="general" className="gap-2">
            <UserCircle className="size-4" />
            <span>{t("tabs.general")}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="size-4" />
            <span>{t("tabs.security")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <GeneralInfoForm profile={profile} />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {profile.hasPassword ? <ChangePasswordForm /> : <SetupPasswordForm />}

          <SocialAccountsCard />

          <SessionCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
