import { UserService } from '@/api/user/user.service';
import { DomainType, UserStatus } from '@/constants/entity.enum';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtPayload, JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockUserService = {
    findById: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UserService, useValue: mockUserService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    jest.clearAllMocks();
  });

  it('should validate and return user when token payload is valid', async () => {
    const mockUser = {
      id: '1',
      domain: DomainType.CLIENT,
      status: UserStatus.ACTIVE,
    };
    mockUserService.findById.mockResolvedValue(mockUser);

    const payload: JwtPayload = {
      sub: '1',
      domain: DomainType.CLIENT,
      sessionId: '10',
    };

    const result = await strategy.validate(payload);
    expect(result).toEqual(Object.assign(mockUser, { sid: '10' }));
  });

  it('should throw UnauthorizedException when token domain does not match user domain', async () => {
    const mockUser = {
      id: '1',
      domain: DomainType.CLIENT,
      status: UserStatus.ACTIVE,
    };
    mockUserService.findById.mockResolvedValue(mockUser);

    const payload: JwtPayload = {
      sub: '1',
      domain: DomainType.ADMIN,
      sessionId: '10',
    };

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when user status is BLOCKED', async () => {
    const mockUser = {
      id: '1',
      domain: DomainType.CLIENT,
      status: UserStatus.BLOCKED,
    };
    mockUserService.findById.mockResolvedValue(mockUser);

    const payload: JwtPayload = {
      sub: '1',
      domain: DomainType.CLIENT,
      sessionId: '10',
    };

    await expect(strategy.validate(payload)).rejects.toThrow(
      new UnauthorizedException('Your account has been suspended'),
    );
  });

  it('should throw UnauthorizedException when user status is INACTIVE', async () => {
    const mockUser = {
      id: '1',
      domain: DomainType.CLIENT,
      status: UserStatus.INACTIVE,
    };
    mockUserService.findById.mockResolvedValue(mockUser);

    const payload: JwtPayload = {
      sub: '1',
      domain: DomainType.CLIENT,
      sessionId: '10',
    };

    await expect(strategy.validate(payload)).rejects.toThrow(
      new UnauthorizedException('Your account is inactive'),
    );
  });
});
