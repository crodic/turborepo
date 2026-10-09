import { cookies } from "next/headers";

export const POST = async () => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (refreshToken) {
    try {
      const apiUrl =
        process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL;
      await fetch(`${apiUrl}/api/v1/user/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (err) {
      console.error("Server logout revocation failed:", err);
    }
  }

  cookieStore.delete("accessToken");
  cookieStore.delete("refreshToken");
  return Response.json({ message: "Success" }, { status: 200 });
};
