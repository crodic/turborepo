import xior, { XiorInterceptorRequestConfig } from "xior";
import { decodeToken } from "./utils";

export const http = xior.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL!,
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "same-origin",
});

http.interceptors.request.use(
  async (config) => {
    try {
      const { data } = await xior.get<{ accessToken?: string }>(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tokens`
      );
      const accessToken = data?.accessToken;
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      } else {
        delete config.headers.Authorization;
      }
    } catch {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let refreshTokenPromise: Promise<string> | null = null;

export async function refreshClientToken(
  failedToken?: string
): Promise<string | null> {
  if (refreshTokenPromise) {
    return refreshTokenPromise.catch(() => null);
  }

  // Check if user has tokens before attempting refresh
  const tokenRes = await xior
    .get<{
      accessToken?: string;
      refreshToken?: string;
    }>(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tokens`)
    .catch(() => null);

  const cookieAccessToken = tokenRes?.data?.accessToken;
  const refreshToken = tokenRes?.data?.refreshToken;
  if (!refreshToken) {
    return null;
  }

  // If Next.js middleware (proxy.ts) has ALREADY refreshed the token on the server,
  // the cookie already contains a valid, non-expired accessToken different from the failed one.
  if (cookieAccessToken && cookieAccessToken !== failedToken) {
    const payload = decodeToken(cookieAccessToken);
    if (payload?.exp && payload.exp * 1000 > Date.now() + 15_000) {
      http.defaults.headers.Authorization = `Bearer ${cookieAccessToken}`;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:tokens-updated"));
      }
      return cookieAccessToken;
    }
  }

  refreshTokenPromise = refreshTokenApi(refreshToken);
  try {
    return await refreshTokenPromise;
  } catch {
    return null;
  }
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as XiorInterceptorRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const failedToken =
        originalRequest.headers.Authorization?.toString().replace(
          /^Bearer\s+/i,
          ""
        );

      return refreshClientToken(failedToken).then((newAccessToken) => {
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

const refreshTokenApi = async (refreshToken: string): Promise<string> => {
  try {
    const res = await xior.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/auth/refresh`,
      { refreshToken },
      { credentials: "same-origin" }
    );

    const { accessToken, refreshToken: newRefreshToken } = res.data;
    await xior.post(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tokens`, {
      accessToken,
      refreshToken: newRefreshToken,
    });

    http.defaults.headers.Authorization = `Bearer ${accessToken}`;

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:tokens-updated"));
    }

    return accessToken;
  } catch (err) {
    // Only logged-in users whose refresh token expired reach here.
    // Clean up session via POST /api/auth/logout and redirect to login.
    await xior
      .post(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/logout`, {
        credentials: "same-origin",
      })
      .catch(() => null);

    if (typeof window !== "undefined") {
      window.location.href = "/auth/login?code=SESSION_EXPIRED";
    }
    throw err;
  } finally {
    refreshTokenPromise = null;
  }
};
