import xior, { XiorInterceptorRequestConfig } from "xior";
import { AUTH_CODE, AUTH_QUERY_PARAM } from "@/constants/auth";

export function getClientCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export const http = xior.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL!,
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "same-origin",
});

http.interceptors.request.use(
  (config) => {
    if (config.headers.Authorization) {
      return config;
    }

    const accessToken = getClientCookie("accessToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let refreshTokenPromise: Promise<string | null> | null = null;

export async function refreshClientToken(): Promise<string | null> {
  if (refreshTokenPromise) {
    return refreshTokenPromise;
  }

  refreshTokenPromise = (async () => {
    try {
      const res = await xior.post<{ accessToken?: string }>(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/refresh`,
        {},
        { credentials: "same-origin" }
      );

      const newAccessToken = res.data?.accessToken;
      if (!newAccessToken) {
        return null;
      }

      if (typeof document !== "undefined") {
        document.cookie = `accessToken=${encodeURIComponent(newAccessToken)}; path=/; sameSite=lax`;
      }
      http.defaults.headers.Authorization = `Bearer ${newAccessToken}`;
      return newAccessToken;
    } catch (err: unknown) {
      const status =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;

      const isAuthFailure = status === 401 || status === 400;

      if (isAuthFailure) {
        if (typeof document !== "undefined") {
          document.cookie = "accessToken=; path=/; max-age=0";
        }
        await xior
          .post(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/logout`,
            {},
            { credentials: "same-origin" }
          )
          .catch(() => null);

        if (typeof window !== "undefined") {
          window.location.href = `/auth/login?${AUTH_QUERY_PARAM.CODE}=${AUTH_CODE.SESSION_EXPIRED}`;
        }
      }
      throw err;
    } finally {
      refreshTokenPromise = null;
    }
  })();

  return refreshTokenPromise;
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as XiorInterceptorRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      return refreshClientToken().then((newAccessToken) => {
        if (!newAccessToken) {
          return Promise.reject(error);
        }
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return http.request(originalRequest);
      });
    }

    return Promise.reject(error);
  }
);
