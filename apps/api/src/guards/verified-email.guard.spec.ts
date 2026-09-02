import {
  IS_AUTH_OPTIONAL,
  IS_PUBLIC,
  REQUIRE_VERIFIED_EMAIL,
} from '@/constants/app.constant';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { VerifiedEmailGuard } from './verified-email.guard';

describe('VerifiedEmailGuard', () => {
  let guard: VerifiedEmailGuard;
  let reflector: Reflector;

  const createMockExecutionContext = (user?: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifiedEmailGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<VerifiedEmailGuard>(VerifiedEmailGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if route is marked as @Public()', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC) return true;
      return false;
    });

    const context = createMockExecutionContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if route is marked as @AuthOptional()', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_AUTH_OPTIONAL) return true;
      return false;
    });

    const context = createMockExecutionContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if route does not require verified email', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const context = createMockExecutionContext({ id: '1' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if route requires verified email and user has verifiedAt date', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === REQUIRE_VERIFIED_EMAIL) return true;
      return false;
    });

    const context = createMockExecutionContext({
      id: '1',
      email: 'user@example.com',
      verifiedAt: new Date(),
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if route requires verified email and user.verifiedAt is null/undefined', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === REQUIRE_VERIFIED_EMAIL) return true;
      return false;
    });

    const context = createMockExecutionContext({
      id: '1',
      email: 'user@example.com',
      verifiedAt: null,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user is not attached to request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === REQUIRE_VERIFIED_EMAIL) return true;
      return false;
    });

    const context = createMockExecutionContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
