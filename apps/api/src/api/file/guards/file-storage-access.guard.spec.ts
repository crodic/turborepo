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
});
