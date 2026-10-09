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
  if (!intlResponse.ok) {
    return intlResponse;
  }

  const { locale, pathname } = extractLocaleAndPathname(request, intlResponse);
  const accessToken = request.cookies.get("accessToken")?.value || "";
  const refreshToken = request.cookies.get("refreshToken")?.value || "";

  const { isCorrupt, shouldRefresh } = evaluateTokenState(
    accessToken,
    refreshToken
  );

  if (isCorrupt) {
    const unauthRes = unauthorizedResponse(
      request,
      intlResponse,
      locale,
      pathname,
      AUTH_CODE.INVALID_TOKEN
    );
    if (unauthRes !== intlResponse) {
      return unauthRes;
    }
  }

  if (shouldRefresh) {
    const refreshRes = await refreshTokenMiddleware(
      request,
      intlResponse,
      locale,
      pathname
    );
    if (refreshRes !== intlResponse) {
      return refreshRes;
    }
  }

  return finalizeResponse(request, intlResponse, pathname);
}

function extractLocaleAndPathname(
  request: NextRequest,
  intlResponse: NextResponse
) {
  const [, locale, ...rest] = new URL(
    intlResponse.headers.get("x-middleware-rewrite") || request.url
  ).pathname.split("/");

  return {
    locale,
    pathname: "/" + rest.join("/"),
  };
}

function evaluateTokenState(accessToken: string, refreshToken: string) {
  if (!refreshToken) {
    return { shouldRefresh: false, isCorrupt: false };
  }

  if (!accessToken) {
    return { shouldRefresh: true, isCorrupt: false };
  }

  const payload = decodeToken(accessToken);
  if (!payload?.exp) {
    return { shouldRefresh: false, isCorrupt: true };
  }

  const oneMinuteFromNow = Date.now() + 60_000;
  const isExpiringSoon = payload.exp * 1000 < oneMinuteFromNow;

  return { shouldRefresh: isExpiringSoon, isCorrupt: false };
}

function finalizeResponse(
  request: NextRequest,
  intlResponse: NextResponse,
  pathname: string
) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

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

    intlResponse.cookies.set("accessToken", newAccessToken, {
      httpOnly: true,
      path: "/",
      expires: new Date(expAccessToken * 1000),
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    intlResponse.cookies.set("refreshToken", newRefreshToken, {
      httpOnly: true,
      path: "/",
      expires: new Date(expRefreshToken * 1000),
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return intlResponse;
  } catch (error: any) {
    console.error("Middleware refresh token failed:", error?.message || error);
    const status = error?.response?.status;
    if (status === 401 || status === 400) {
      return unauthorizedResponse(
        request,
        intlResponse,
        locale,
        pathname,
        AUTH_CODE.SESSION_EXPIRED
      );
    }
    // Network error or transient 5xx error: do not wipe cookies, proceed with request
    return intlResponse;
  }
};

const unauthorizedResponse = (
  request: NextRequest,
  intlResponse: NextResponse,
  locale: string,
  pathname: string,
  code: AuthCode = AUTH_CODE.SESSION_EXPIRED
) => {
  intlResponse.cookies.delete("accessToken");
  intlResponse.cookies.delete("refreshToken");

  // If already on an auth page, or on public home page, do not force-redirect to login
  if (!pathname || pathname === "/" || pathname.startsWith("/auth")) {
    return intlResponse;
  }

  const redirectUrl = new URL(`/${locale}/auth/login`, request.url);
  redirectUrl.searchParams.set(AUTH_QUERY_PARAM.CODE, code);
  redirectUrl.searchParams.set(AUTH_QUERY_PARAM.FROM, pathname);

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
