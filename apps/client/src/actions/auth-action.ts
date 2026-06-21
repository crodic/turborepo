"use server";

import { decodeToken } from "@/lib/utils";
import { JWTPayload } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import xior from "xior";

/**
 * Validate auth action request by check if have refresh token and access token in cookies (Only using server actions).
 * If not have refresh token, logout and redirect to login page.
 * If not have access token but have refresh token, call refreshTokenFormServerAction to get new access token.
 * If have access token and refresh token, check if access token is expired in 1 minute.
 * If yes, call refreshTokenFormServerAction to get new access token.
 * @returns {Promise<void>}
 */
export const validateAuthActionRequest = async () => {
  const cookie = await cookies();
  const refreshToken = cookie.get("refreshToken")?.value || "";
  const accessToken = cookie.get("accessToken")?.value || "";
  if (!refreshToken) {
    console.log(">>> Server Action: No refresh token");
    cookie.delete("accessToken");
    const message = encodeURIComponent(
      "Session is expired, please login again"
    );
    redirect(`/auth/login?msg=${message}`);
  }

  if (!accessToken && refreshToken) {
    await refreshTokenFormServerAction();
  }

  if (accessToken && refreshToken) {
    const payload = decodeToken(accessToken);
    if (!payload) {
      cookie.delete("accessToken");
      cookie.delete("refreshToken");
      const message = encodeURIComponent(
        "Session is expired, please login again"
      );
      redirect(`/auth/login?msg=${message}`);
    }

    const tokenExpiresAt = (payload.exp as number) * 1000;
    const now = Date.now();
    const oneMinuteLater = now + 1 * 60 * 1000;

    if (tokenExpiresAt < oneMinuteLater) {
      await refreshTokenFormServerAction();
    }
  }
};

const refreshTokenFormServerAction = async () => {
  const cookie = await cookies();
  const refreshToken = cookie.get("refreshToken")?.value;

  try {
    const { data } = await xior.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/auth/refresh`,
      {
        token: refreshToken,
      }
    );
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data;
    const { exp: expAccessToken } = decodeToken(newAccessToken) as JWTPayload;
    const { exp: expRefreshToken } = decodeToken(newRefreshToken) as JWTPayload;

    if (!expAccessToken || !expRefreshToken) {
      cookie.delete("accessToken");
      cookie.delete("refreshToken");
      throw new Error("Invalid JWT Token");
    }

    cookie.set("accessToken", newAccessToken, {
      httpOnly: true,
      path: "/",
      expires: new Date(expAccessToken * 1000),
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    cookie.set("refreshToken", newRefreshToken, {
      httpOnly: true,
      path: "/",
      expires: new Date(expRefreshToken * 1000),
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  } catch (error) {
    console.log(error);
    cookie.delete("accessToken");
    cookie.delete("refreshToken");
    redirect("/auth/login");
  }
};
