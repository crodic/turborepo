import xior from "xior";
import { NextResponse } from "next/server";
import type { NextRequest, ProxyConfig } from "next/server";
import { decodeToken } from "./lib/utils";
import { JWTPayload } from "jose";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const AUTH_ROUTE = ["/auth/login", "/auth/register"];
const PRIVATE_ROUTE = ["/client-profile"];
const handleI18nRouting = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const intlResponse = handleI18nRouting(request);

  if (intlResponse.ok) {
    const [, locale, ...rest] = new URL(
      intlResponse.headers.get("x-middleware-rewrite") || request.url
    ).pathname.split("/");

    const pathname = "/" + rest.join("/");

    const refreshToken = request.cookies.get("refreshToken")?.value || "";
    const accessToken = request.cookies.get("accessToken")?.value || "";

    console.log(">>> Entered middleware with pathname: ", pathname);

    if (AUTH_ROUTE.includes(pathname) && refreshToken) {
      return NextResponse.redirect(
        new URL(`/${locale}/client-profile`, request.url),
        { headers: intlResponse.headers }
      );
    }

    if (PRIVATE_ROUTE.includes(pathname)) {
      if (refreshToken && !accessToken) {
        return await refreshTokenMiddleware(request, intlResponse);
      }

      if (!refreshToken) {
        const msg = encodeURIComponent(
          "Session is expired, please login again."
        );
        const response = NextResponse.redirect(
          new URL(`/${locale}/auth/login?msg=${msg}`, request.url),
          { headers: intlResponse.headers }
        );
        response.cookies.delete("accessToken");
        return response;
      }

      if (accessToken && refreshToken) {
        const payload = decodeToken(accessToken);
        if (payload === null) {
          const msg = encodeURIComponent(
            "Session is expired, please login again."
          );
          const response = NextResponse.redirect(
            new URL(`/${locale}/auth/login?msg=${msg}`, request.url),
            { headers: intlResponse.headers }
          );
          response.cookies.delete("accessToken");
          response.cookies.delete("refreshToken");
          return response;
        }

        const tokenExpiresAt = (payload.exp as number) * 1000;
        const now = Date.now();
        const oneMinuteLater = now + 1 * 60 * 1000;

        if (tokenExpiresAt < oneMinuteLater) {
          return await refreshTokenMiddleware(request, intlResponse);
        }
      }
    }

    if (refreshToken && !accessToken) {
      return await refreshTokenMiddleware(request, intlResponse);
    }

    return NextResponse.next({ headers: intlResponse.headers });
  }

  return intlResponse;
}

const refreshTokenMiddleware = async (
  request: NextRequest,
  intlResponse: NextResponse
) => {
  const refreshToken = request.cookies.get("refreshToken")?.value || "";
  try {
    const { data } = await xior.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/auth/refresh`,
      {
        refreshToken: refreshToken,
      }
    );
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data;

    const { exp: expAccessToken } = decodeToken(newAccessToken) as JWTPayload;
    const { exp: expRefreshToken } = decodeToken(newRefreshToken) as JWTPayload;

    if (!expAccessToken || !expRefreshToken) {
      return unauthorizedResponse(request, intlResponse);
    }

    const response = intlResponse;
    response.cookies.set("accessToken", newAccessToken, {
      httpOnly: true,
      path: "/",
      expires: new Date(expAccessToken * 1000),
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    response.cookies.set("refreshToken", newRefreshToken, {
      httpOnly: true,
      path: "/",
      expires: new Date(expAccessToken * 1000),
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.log(error);
    return unauthorizedResponse(request, intlResponse);
  }
};

const unauthorizedResponse = (
  request: NextRequest,
  intlResponse: NextResponse
) => {
  const response = NextResponse.redirect(new URL("/auth/login", request.url), {
    headers: intlResponse.headers,
  });
  response.cookies.delete("accessToken");
  response.cookies.delete("refreshToken");
  return response;
};

export const config: ProxyConfig = {
  matcher: [
    {
      source:
        "/((?!api|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
