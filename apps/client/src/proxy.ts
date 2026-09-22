import xior from "xior";
import { NextResponse } from "next/server";
import type { NextRequest, ProxyConfig } from "next/server";
import { decodeToken } from "./lib/utils";
import { JWTPayload } from "jose";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { AUTH_CODE, AUTH_QUERY_PARAM, AuthCode } from "./constants/auth";

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

    // Proactive token refresh & session validation for authenticated users
    if (accessToken && refreshToken) {
      const payload = decodeToken(accessToken);
      if (payload === null) {
        return unauthorizedResponse(
          request,
          intlResponse,
          locale,
          pathname,
          AUTH_CODE.INVALID_TOKEN
        );
      }

      const tokenExpiresAt = (payload.exp as number) * 1000;
      const now = Date.now();
      const oneMinuteLater = now + 1 * 60 * 1000;

      if (tokenExpiresAt < oneMinuteLater) {
        return await refreshTokenMiddleware(
          request,
          intlResponse,
          locale,
          pathname
        );
      }
    }

    if (refreshToken && !accessToken) {
      return await refreshTokenMiddleware(
        request,
        intlResponse,
        locale,
        pathname
      );
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);

    // Forward any internal request headers set by next-intl middleware (e.g. x-next-intl-locale)
    intlResponse.headers.forEach((value, key) => {
      if (key.startsWith("x-middleware-request-")) {
        requestHeaders.set(key.replace("x-middleware-request-", ""), value);
      }
    });

    const rewriteUrl = intlResponse.headers.get("x-middleware-rewrite");
    if (rewriteUrl) {
      return NextResponse.rewrite(new URL(rewriteUrl, request.url), {
        request: { headers: requestHeaders },
        headers: intlResponse.headers,
      });
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
      headers: intlResponse.headers,
    });
  }

  return intlResponse;
}

const refreshTokenMiddleware = async (
  request: NextRequest,
  intlResponse: NextResponse,
  locale: string,
  pathname: string
) => {
  const refreshToken = request.cookies.get("refreshToken")?.value || "";
  try {
    const apiUrl =
      process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL;
    const { data } = await xior.post(`${apiUrl}/api/v1/user/auth/refresh`, {
      refreshToken: refreshToken,
    });
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data;

    const { exp: expAccessToken } = decodeToken(newAccessToken) as JWTPayload;
    const { exp: expRefreshToken } = decodeToken(newRefreshToken) as JWTPayload;

    if (!expAccessToken || !expRefreshToken) {
      return unauthorizedResponse(
        request,
        intlResponse,
        locale,
        pathname,
        AUTH_CODE.SESSION_EXPIRED
      );
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
      expires: new Date(expRefreshToken * 1000),
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.log(error);
    return unauthorizedResponse(
      request,
      intlResponse,
      locale,
      pathname,
      AUTH_CODE.SESSION_EXPIRED
    );
  }
};

const unauthorizedResponse = (
  request: NextRequest,
  intlResponse: NextResponse,
  locale: string,
  pathname: string,
  code: AuthCode = AUTH_CODE.SESSION_EXPIRED
) => {
  const redirectUrl = new URL(`/${locale}/auth/login`, request.url);
  redirectUrl.searchParams.set(AUTH_QUERY_PARAM.CODE, code);
  if (pathname && pathname !== "/" && !pathname.startsWith("/auth")) {
    redirectUrl.searchParams.set(AUTH_QUERY_PARAM.FROM, pathname);
  }

  const response = NextResponse.redirect(redirectUrl, {
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
        "/((?!api|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt)).*)",
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
