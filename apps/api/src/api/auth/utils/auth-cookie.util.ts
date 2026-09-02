import { DomainType } from '@/constants/entity.enum';
import type { Response } from 'express';

export type AuthCookiePrefix = 'admin' | 'user';

export type AuthCookieTokens = {
  accessToken?: string;
  refreshToken?: string;
  tokenExpires?: number;
};

const cookieNames = {
  admin: {
    access: 'admin_access_token',
    refresh: 'admin_refresh_token',
  },
  user: {
    access: 'user_access_token',
    refresh: 'user_refresh_token',
  },
} as const;

export function setAuthCookies({
  res,
  prefix,
  domain,
  accessToken,
  refreshToken,
  tokenExpires,
  tokens,
}: {
  res: Response;
  configService?: any;
  prefix?: AuthCookiePrefix;
  domain?: DomainType;
  accessToken?: string;
  refreshToken?: string;
  tokenExpires?: number;
  tokens?: AuthCookieTokens;
}) {
  const p = prefix ?? (domain === DomainType.ADMIN ? 'admin' : 'user');
  const names = cookieNames[p];
  const access = accessToken ?? tokens?.accessToken;
  const refresh = refreshToken ?? tokens?.refreshToken;
  const expires = tokenExpires ?? tokens?.tokenExpires;

  const secure = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
  };

  if (access) {
    res.cookie(names.access, access, {
      ...cookieOptions,
      maxAge: expires ? Math.max(expires - Date.now(), 0) : undefined,
    });
  }

  if (refresh) {
    res.cookie(names.refresh, refresh, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}

export function clearAuthCookies(
  resOrParams:
    | Response
    | {
        res: Response;
        configService?: any;
        prefix?: AuthCookiePrefix;
      },
  domainOrPrefix?: DomainType | string,
) {
  let res: Response;
  let p: AuthCookiePrefix = 'admin';

  if ('res' in resOrParams) {
    res = resOrParams.res;
    p = resOrParams.prefix ?? 'admin';
  } else {
    res = resOrParams;
    p =
      domainOrPrefix === DomainType.ADMIN || String(domainOrPrefix) === 'admin'
        ? 'admin'
        : 'user';
  }

  const names = cookieNames[p];
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };

  res.clearCookie(names.access, cookieOptions);
  res.clearCookie(names.refresh, cookieOptions);
}

export function getAuthCookieNames(prefix: AuthCookiePrefix) {
  return cookieNames[prefix];
}
