"use server";

import { AUTH_CODE, AUTH_QUERY_PARAM } from "@/constants/auth";
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
    cookie.delete("accessToken");
    redirect(
      `/auth/login?${AUTH_QUERY_PARAM.CODE}=${AUTH_CODE.SESSION_EXPIRED}`
    );
  }

  if (!accessToken && refreshToken) {
    await refreshTokenFormServerAction();
  }

  if (accessToken && refreshToken) {
    const payload = decodeToken(accessToken);
    if (!payload) {
      cookie.delete("accessToken");
      cookie.delete("refreshToken");
      redirect(
        `/auth/login?${AUTH_QUERY_PARAM.CODE}=${AUTH_CODE.INVALID_TOKEN}`
      );
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
  if (!refreshToken) {
    cookie.delete("accessToken");
    redirect(
      `/auth/login?${AUTH_QUERY_PARAM.CODE}=${AUTH_CODE.SESSION_EXPIRED}`
    );
  }

  try {
    const apiUrl =
      process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL;
    const { data } = await xior.post(`${apiUrl}/api/v1/user/auth/refresh`, {
      refreshToken,
    });
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
  } catch (error: any) {
    // If error is already a Next.js redirect exception, re-throw it
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }

    console.error(
      "Refresh token server action error:",
      error?.message || error
    );
    const status = error?.response?.status;
    if (status === 401 || status === 400) {
      cookie.delete("accessToken");
      cookie.delete("refreshToken");
      redirect(
        `/auth/login?${AUTH_QUERY_PARAM.CODE}=${AUTH_CODE.SESSION_EXPIRED}`
      );
    }
    // For transient/network errors, re-throw without clearing user's stored cookies
    throw error;
  }
};
