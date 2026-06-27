import type { Request } from 'express';
import { extractCookieToken } from './token-extractor.util';

describe('token extractors', () => {
  it('extracts auth tokens from cookies', () => {
    const request = {
      headers: {
        cookie: 'theme=dark; admin_access_token=admin-token; other=value',
      },
    } as Request;

    expect(extractCookieToken(request, 'admin_access_token')).toBe(
      'admin-token',
    );
  });

  it('does not treat query tokens as cookie tokens', () => {
    const request = {
      headers: {},
      query: { token: 'query-token' },
    } as unknown as Request;

    expect(extractCookieToken(request, 'admin_access_token')).toBeNull();
  });
});
