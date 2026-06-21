"use client";

import { SocialAccount, User } from "@/types/apis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { http } from "@/lib/http";
import { getClientToken } from "@/services/apis";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useRef } from "react";
import { toast } from "sonner";
import xior from "xior";

export default function Profile() {
  const [profile, setProfile] = React.useState<User | null>(null);
  const [socialAccounts, setSocialAccounts] = React.useState<SocialAccount[]>(
    []
  );
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledSocialStatusRef = useRef(false);

  const handleClientSignOut = async () => {
    try {
      const data = await getClientToken();
      await http.post("/api/v1/user/auth/logout", {
        refreshToken: data.refreshToken,
      });
      await xior.post<{ message: string }>(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/logout`,
        {
          credentials: "same-origin",
        }
      );
      window.dispatchEvent(new Event("auth:tokens-updated"));
      router.push("/auth/login");
    } catch (error) {
      console.error(">>> Error signing out:", error);
    }
  };

  useEffect(() => {
    if (handledSocialStatusRef.current) {
      return;
    }

    handledSocialStatusRef.current = true;

    const social = searchParams.get("social");

    if (social === "linked") {
      toast.success("Google account linked successfully.");
      router.replace("/client-profile");
    }

    if (social === "failed") {
      toast.error("Could not link Google account.");
      router.replace("/client-profile");
    }
  }, [router, searchParams]);

  useEffect(() => {
    let ignore = false;

    const fetchProfile = async () => {
      try {
        const [profileResponse, socialAccountsResponse] = await Promise.all([
          http.get<User>("/api/v1/user/auth/me"),
          http.get<SocialAccount[]>("/api/v1/user/auth/me/social-accounts"),
        ]);

        if (ignore) {
          return;
        }

        setProfile(profileResponse.data);
        setSocialAccounts(socialAccountsResponse.data);
      } catch (error) {
        if (ignore) {
          return;
        }

        console.error(">>> Error fetching profile:", error);
      }
    };
    fetchProfile();

    return () => {
      ignore = true;
    };
  }, []);

  const handleLinkGoogle = async () => {
    try {
      const { data } = await http.post<{ url: string }>(
        "/api/v1/user/auth/me/social/google/link"
      );
      window.location.href = data.url;
    } catch {
      toast.error("Could not start Google account linking.");
    }
  };

  const handleSetupPassword = async () => {
    try {
      await http.post("/api/v1/user/auth/me/setup-password", {
        password,
        confirmPassword,
      });
      toast.success("Password configured successfully.");
      setPassword("");
      setConfirmPassword("");
      setProfile((current) =>
        current ? { ...current, hasPassword: true } : current
      );
    } catch {
      toast.error("Could not configure password.");
    }
  };

  const hasGoogleLinked = socialAccounts.some(
    (account) => account.provider === "google"
  );

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 px-6">
      <p className="w-80 overflow-hidden">
        {profile && (
          <>
            <b>This is user fetch on Client:</b> {profile.fullName}
          </>
        )}
      </p>
      <div className="w-full max-w-md space-y-3 rounded-lg border p-4">
        <div>
          <h2 className="font-semibold">Connected accounts</h2>
          <p className="text-muted-foreground text-sm">
            Link Google to sign in with either Google or email/password.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">
            Google: {hasGoogleLinked ? "Linked" : "Not linked"}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={hasGoogleLinked}
            onClick={handleLinkGoogle}
          >
            {hasGoogleLinked ? "Linked" : "Link Google"}
          </Button>
        </div>
      </div>
      {profile && !profile.hasPassword ? (
        <div className="w-full max-w-md space-y-3 rounded-lg border p-4">
          <div>
            <h2 className="font-semibold">Setup password</h2>
            <p className="text-muted-foreground text-sm">
              Add a password so you can also sign in with email/password.
            </p>
          </div>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <Button type="button" onClick={handleSetupPassword}>
            Setup password
          </Button>
        </div>
      ) : null}
      <Button asChild>
        <Link href="/update-profile">Update Profile In Client</Link>
      </Button>
      <Button asChild>
        <Link href="/server-profile">Go to Server Profile</Link>
      </Button>
      <Button onClick={handleClientSignOut} variant="destructive">
        SignOut
      </Button>
    </div>
  );
}
