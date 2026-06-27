import type { Request } from 'express';

export function extractCookieToken(request: Request, name: string) {
  const cookies = parseCookies(request.headers.cookie);

  return cookies[name] ?? null;
}

export function extractMediaQueryToken(request: Request) {
  if (!request.path.startsWith('/storage/uploads')) {
    return null;
  }

  const token = request.query.token;
  return typeof token === 'string' ? token : null;
}

function parseCookies(cookieHeader?: string) {
  if (!cookieHeader) return {};

  return cookieHeader
    .split(';')
    .reduce<Record<string, string>>((cookies, part) => {
      const [name, ...valueParts] = part.trim().split('=');
      if (!name) return cookies;

      cookies[name] = decodeURIComponent(valueParts.join('='));
      return cookies;
    }, {});
}
