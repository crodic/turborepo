import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AUTH_CODE, AUTH_QUERY_PARAM } from "@/constants/auth";
import { decodeToken } from "@/lib/utils";

interface ProtectedLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function ProtectedLayout({
  children,
  params,
}: ProtectedLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const fromParam =
    pathname && pathname !== "/" && !pathname.startsWith("/auth")
      ? `&${AUTH_QUERY_PARAM.FROM}=${encodeURIComponent(pathname)}`
      : "";

  if (!refreshToken) {
    const code = accessToken
      ? AUTH_CODE.SESSION_EXPIRED
      : AUTH_CODE.UNAUTHORIZED;
    redirect(
      `/${locale}/auth/login?${AUTH_QUERY_PARAM.CODE}=${code}${fromParam}`
    );
  }

  if (accessToken) {
    const payload = decodeToken(accessToken);
    if (payload === null) {
      redirect(
        `/${locale}/auth/login?${AUTH_QUERY_PARAM.CODE}=${AUTH_CODE.INVALID_TOKEN}${fromParam}`
      );
    }
  }

  return <>{children}</>;
}
