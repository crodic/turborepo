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
    const { data } = await xior.get(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tokens`
    );
    const { accessToken } = data;
    config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
  },
  (error) => Promise.reject(error)
);

let refreshTokenPromise: Promise<string> | null = null;

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as XiorInterceptorRequestConfig & {
      _retry: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshTokenPromise) {
        refreshTokenPromise = refreshTokenApi();
      }

      return refreshTokenPromise.then((newAccessToken) => {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return http.request(originalRequest);
      });
    }

    return Promise.reject(error);
  }
);

const refreshTokenApi = async (): Promise<string> => {
  try {
    const getToken = await xior.get<{
      accessToken: string | undefined;
      refreshToken: string | undefined;
    }>(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tokens`);
    const { refreshToken } = getToken.data;

    if (!refreshToken) throw new Error("No refresh token");

    const res = await xior.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/auth/refresh`,
      { refreshToken: refreshToken },
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
    await xior.delete(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/logout`);
    if (typeof window !== "undefined") {
      location.href = "/auth/login";
    }
    throw err;
  } finally {
    refreshTokenPromise = null;
  }
};
