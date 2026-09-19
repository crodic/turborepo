import xior, { XiorInterceptorRequestConfig } from "xior";

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

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as XiorInterceptorRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Check if user has a refresh token before attempting refresh
      const tokenRes = await xior
        .get<{
          refreshToken?: string;
        }>(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tokens`)
        .catch(() => null);

      const refreshToken = tokenRes?.data?.refreshToken;
      if (!refreshToken) {
        // User is not logged in. Do not attempt refresh, do not logout, do not redirect.
        return Promise.reject(error);
      }

      if (!refreshTokenPromise) {
        refreshTokenPromise = refreshTokenApi(refreshToken);
      }

      return refreshTokenPromise.then((newAccessToken) => {
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
