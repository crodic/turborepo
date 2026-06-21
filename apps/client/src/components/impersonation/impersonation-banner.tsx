"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import xior from "xior";
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
import { http } from "@/lib/http";
import { User } from "@/types/apis";

export function ImpersonationBanner() {
  const [profile, setProfile] = useState<User | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let ignore = false;

    const loadImpersonationState = async () => {
      try {
        const { data: tokens } = await xior.get<{
          accessToken?: string;
          refreshToken?: string;
        }>(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tokens`);

        if (!tokens.accessToken) {
          if (!ignore) {
            setProfile(null);
          }
          return;
        }

        const { data } = await xior.get<User>(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          }
        );

        if (!ignore && data.isImpersonating) {
          setProfile(data);
          return;
        }

        if (!ignore) {
          setProfile(null);
        }
      } catch {
        if (!ignore) {
          setProfile(null);
        }
      }
    };

    void loadImpersonationState();
    window.addEventListener("auth:tokens-updated", loadImpersonationState);

    return () => {
      ignore = true;
      window.removeEventListener("auth:tokens-updated", loadImpersonationState);
    };
  }, []);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [profile]);

  const handleStopImpersonating = async () => {
    if (!profile) {
      return;
    }

    setIsStopping(true);

    try {
      await http.post("/api/v1/user/auth/stop-impersonating");
      await xior.post(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/logout`);
      window.dispatchEvent(new Event("auth:tokens-updated"));
      toast.success("Impersonation session stopped.");

      const adminPortalUrl =
        process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL || "http://localhost:5173";
      window.location.assign(`${adminPortalUrl}/users/${profile.id}/show`);
    } catch {
      toast.error("Could not stop impersonation. Please try again.");
      setIsStopping(false);
    }
  };

  if (!profile) {
    return null;
  }

  const remainingLabel = formatRemainingTime(
    profile.impersonationExpiresAt,
    now
  );

  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b border-amber-300 bg-amber-50 px-4 py-2 text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">
              You are impersonating {profile.fullName || profile.email}.
            </p>
            <p className="text-xs opacity-80">
              Actions in this tab are performed as this user.
              {remainingLabel ? ` Time remaining: ${remainingLabel}.` : ""}
            </p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-amber-400 bg-white text-amber-950 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50 dark:hover:bg-amber-900"
              disabled={isStopping}
            >
              {isStopping ? "Stopping..." : "Stop impersonating"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Stop impersonating?</AlertDialogTitle>
              <AlertDialogDescription>
                This will end the impersonation session for{" "}
                {profile.fullName || profile.email}, clear the client session,
                and return you to the admin portal.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isStopping}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isStopping}
                onClick={handleStopImpersonating}
              >
                Stop impersonating
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function formatRemainingTime(expiresAt?: string, now = Date.now()) {
  if (!expiresAt) {
    return null;
  }

  const remainingMs = new Date(expiresAt).getTime() - now;

  if (remainingMs <= 0) {
    return "expired";
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}
