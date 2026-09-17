"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSignOut } from "@/hooks/use-profile";
import { useTranslations } from "next-intl";
import React from "react";
import { Loader2, LogOut, ShieldAlert } from "lucide-react";

export function SessionCard() {
  const t = useTranslations("Security.session");
  const signOutMutation = useSignOut();

  const handleSignOut = () => {
    signOutMutation.mutate();
  };

  const isSigningOut = signOutMutation.isPending;

  return (
    <Card className="border-destructive/20 bg-destructive/5 shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-destructive size-5" />
          <CardTitle className="text-destructive text-xl">
            {t("title")}
          </CardTitle>
        </div>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border-destructive/20 bg-background/50 flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">{t("signOut")}</p>
            <p className="text-muted-foreground text-xs">
              {t("confirmDescription")}
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={isSigningOut}
                className="shrink-0"
              >
                {isSigningOut ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t("signingOut")}
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 size-4" />
                    {t("signOut")}
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("confirmDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleSignOut}
                >
                  {t("confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
