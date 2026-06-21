"use server";

import { validateAuthActionRequest } from "@/actions/auth-action";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import xior from "xior";

export const updateProfileFormServerAction = async (formData: FormData) => {
  console.log(">>> Server Action Called");
  const cookie = await cookies();

  //TODO: Call validateAuthActionRequest
  await validateAuthActionRequest();

  const token = cookie.get("accessToken")?.value;
  const displayName = formData.get("displayName") as string;
  //* Call update user api (express server)
  await xior
    .put(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/auth/me`,
      { displayName },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    .catch((error) => {
      console.log(error.message);
    });
  revalidatePath("/server-profile");
};
