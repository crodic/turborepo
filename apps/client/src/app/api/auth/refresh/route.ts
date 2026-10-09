import { cookies } from "next/headers";
import { decodeJwt } from "jose";

export const POST = async () => {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (!refreshToken) {
    return Response.json({ message: "No refresh token" }, { status: 401 });
  }

  try {
    const apiUrl =
      process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(`${apiUrl}/api/v1/user/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 400) {
        cookieStore.delete("accessToken");
        cookieStore.delete("refreshToken");
      }
      return Response.json(
        { message: "Refresh token failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data;

    const expAccessToken = decodeJwt(newAccessToken).exp;
    const expRefreshToken = decodeJwt(newRefreshToken).exp;

    if (!expAccessToken || !expRefreshToken) {
      return Response.json({ message: "Invalid tokens" }, { status: 500 });
    }

    cookieStore.set("accessToken", newAccessToken, {
      path: "/",
      httpOnly: true,
      expires: new Date(expAccessToken * 1000),
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    cookieStore.set("refreshToken", newRefreshToken, {
      path: "/",
      httpOnly: true,
      expires: new Date(expRefreshToken * 1000),
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return Response.json({ accessToken: newAccessToken }, { status: 200 });
  } catch (error: any) {
    console.error("Refresh route error:", error?.message || error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
};
