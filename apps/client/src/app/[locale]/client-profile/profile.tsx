"use client";

import { User } from "@/types/apis";
import { Button } from "@/components/ui/button";
import { http } from "@/lib/http";
import { getClientToken } from "@/services/apis";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import xior from "xior";

export default function Profile() {
  const [profile, setProfile] = React.useState<User | null>(null);
  const router = useRouter();

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
    const fetchProfile = async () => {
      try {
        const response = await http.get<User>("/api/v1/user/auth/me");
        console.log(response);
        setProfile(response.data);
      } catch (error) {
        console.error(">>> Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4">
      <p className="w-80 overflow-hidden">
        {profile && (
          <>
            <b>This is user fetch on Client:</b> {profile.fullName}
          </>
        )}
      </p>
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
