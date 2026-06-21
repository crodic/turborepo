import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/types/apis";
import { cookies } from "next/headers";
import Link from "next/link";
import xior from "xior";
import { updateProfileFormServerAction } from "./actions";

const getProfile = async (token: string) => {
  try {
    const response = await xior.get<User>(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/auth/me`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    return response.data;
  } catch (_error: any) {
    console.log(_error);
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
        <b>This is user fetch on Next Server:</b> {user.fullName}
      </p>
      <Button asChild>
        <Link href="/client-profile">Go to Client Profile</Link>
      </Button>

      <form
        className="w-80 space-y-2 border p-2"
        action={updateProfileFormServerAction}
      >
        <Input type="text" name="firstName" defaultValue={user.firstName} />
        <Input type="text" name="lastName" defaultValue={user.lastName} />
        <Button className="w-full" type="submit">
          Server Action Update
        </Button>
      </form>
    </div>
  );
}
