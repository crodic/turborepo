import { cookies } from "next/headers";
import { decodeJwt } from "jose";

export const GET = async () => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value || "";
  const refreshToken = cookieStore.get("refreshToken")?.value || "";

  return Response.json({ accessToken, refreshToken }, { status: 200 });
};

export const POST = async (req: Request) => {
  const body: { accessToken: string; refreshToken: string } = await req.json();
  const cookieStore = await cookies();
  const { accessToken, refreshToken } = body;

  const expAccessToken = decodeJwt(accessToken).exp;
  const expRefreshToken = decodeJwt(refreshToken).exp;

  if (!expAccessToken || !expRefreshToken) {
    return Response.json({ message: "Error" }, { status: 400 });
  }

  cookieStore.set("accessToken", accessToken, {
    path: "/",
    httpOnly: true,
    expires: new Date(expAccessToken * 1000),
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  cookieStore.set("refreshToken", refreshToken, {
    path: "/",
    httpOnly: true,
    expires: new Date(expRefreshToken * 1000),
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return Response.json({ accessToken, refreshToken }, { status: 200 });
};

export const DELETE = async () => {
  const cookieStore = await cookies();
  cookieStore.delete("accessToken");
  cookieStore.delete("refreshToken");
  return Response.json({ message: "Success" }, { status: 200 });
};
