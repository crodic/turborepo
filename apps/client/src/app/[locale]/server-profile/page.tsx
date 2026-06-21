/* eslint-disable @typescript-eslint/no-unused-vars */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/types/apis";
import { cookies } from "next/headers";
import Link from "next/link";
import React from "react";
import xior from "xior";
import { updateProfileFormServerAction } from "./actions";

const getProfile = async (token: string) => {
  try {
    const response = await xior.get<{ user: User }>(
      `${process.env.NEXT_PUBLIC_API_URL}/users/me`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    return response.data.user;
  } catch (error) {
    return null;
  }
};

export default async function Page() {
  const cookie = await cookies();
  const accessToken = cookie.get("accessToken")?.value || "";
  const user = await getProfile(accessToken);

  if (!user) {
    return <>Something went wrong!</>;
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4">
      <p className="w-80 overflow-hidden">
        <b>This is user fetch on Next Server:</b> {user.displayName}
      </p>
      <Button asChild>
        <Link href="/client-profile">Go to Client Profile</Link>
      </Button>

      <form
        className="w-80 space-y-2 border p-2"
        action={updateProfileFormServerAction}
      >
        <Input type="text" name="displayName" defaultValue={user.displayName} />
        <Button className="w-full" type="submit">
          Server Action Update
        </Button>
      </form>
    </div>
  );
}
