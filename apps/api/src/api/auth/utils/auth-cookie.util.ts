import { AllConfigType } from '@/config/config.type';
import { Environment } from '@/constants/app.constant';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import ms, { type StringValue } from 'ms';

type AuthCookiePrefix = 'admin' | 'user';

type AuthCookieTokens = {
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
  configService,
  prefix,
  tokens,
}: {
  res: Response;
  configService: ConfigService<AllConfigType>;
  prefix: AuthCookiePrefix;
  tokens: AuthCookieTokens;
}) {
  const names = cookieNames[prefix];
  const options = getCookieOptions(configService);

  if (tokens.accessToken) {
    res.cookie(names.access, tokens.accessToken, {
      ...options,
      maxAge: tokens.tokenExpires
        ? Math.max(tokens.tokenExpires - Date.now(), 0)
        : undefined,
    });
  }

  if (tokens.refreshToken) {
    const refreshExpiresKey =
      prefix === 'admin' ? 'auth.refreshExpires' : 'auth.userRefreshExpires';
    const refreshExpires = configService.getOrThrow<AllConfigType>(
      refreshExpiresKey,
      { infer: true },
    );

    res.cookie(names.refresh, tokens.refreshToken, {
      ...options,
      maxAge: ms(refreshExpires as StringValue),
    });
  }
}

export function clearAuthCookies({
  res,
  configService,
  prefix,
}: {
  res: Response;
  configService: ConfigService<AllConfigType>;
  prefix: AuthCookiePrefix;
}) {
  const names = cookieNames[prefix];
  const options = getCookieOptions(configService);

  res.clearCookie(names.access, options);
  res.clearCookie(names.refresh, options);
}

export function getAuthCookieNames(prefix: AuthCookiePrefix) {
  return cookieNames[prefix];
}

function getCookieOptions(configService: ConfigService<AllConfigType>) {
  const nodeEnv = configService.getOrThrow<AllConfigType>('app.nodeEnv', {
    infer: true,
  });

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: ![
      Environment.LOCAL,
      Environment.DEVELOPMENT,
      Environment.TEST,
    ].includes(nodeEnv as Environment),
    path: '/',
  };
}
