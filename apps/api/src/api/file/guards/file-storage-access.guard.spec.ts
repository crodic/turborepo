import { UnauthorizedException } from '@nestjs/common';
import { FileStorageAccessGuard } from './file-storage-access.guard';

describe('FileStorageAccessGuard', () => {
  const createContext = () =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    }) as any;

  it('attaches the user without requiring an active CLS context', () => {
    const cls = {
      isActive: jest.fn(() => false),
      set: jest.fn(),
    };
    const guard = new FileStorageAccessGuard({} as any, cls as any);
    const user = { id: '1' };

    expect(() =>
      guard.handleRequest(null, user, null, createContext()),
    ).not.toThrow();
    expect(cls.set).not.toHaveBeenCalled();
  });

  it('throws unauthorized when private media has no authenticated user', () => {
    const guard = new FileStorageAccessGuard({} as any, {} as any);

    expect(() =>
      guard.handleRequest(
        null,
        null,
        { message: 'Unauthorized' },
        createContext(),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('maps media query token to an authorization header for this request only', () => {
    const guard = new FileStorageAccessGuard({} as any, {} as any);
    const request = {
      query: { token: 'media-access-token' },
      headers: {},
    };

    (guard as any).applyMediaQueryToken(request);

    expect(request.headers).toEqual({
      authorization: 'Bearer media-access-token',
    });
  });

  it('does not override an existing authorization header with query token', () => {
    const guard = new FileStorageAccessGuard({} as any, {} as any);
    const request = {
      query: { token: 'media-access-token' },
      headers: { authorization: 'Bearer existing-token' },
    };

    (guard as any).applyMediaQueryToken(request);

    expect(request.headers.authorization).toBe('Bearer existing-token');
  });
});
