import { AutoIncrementID } from '@/common/types/common.type';
import { Branded } from '@/common/types/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { JwtService } from '@nestjs/jwt';
import crypto from 'crypto';
import ms, { StringValue } from 'ms';
import { JwtPayloadType } from '../types/jwt-payload.type';
import { JwtRefreshPayloadType } from '../types/jwt-refresh-payload.type';

export type AuthTokenPair = Branded<
  {
    accessToken: string;
    refreshToken: string;
    tokenExpires: number;
  },
  'token'
>;

export type TokenSigningConfig = {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
};

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwtService: JwtService) {}

  generateSessionHash(): string {
    return crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');
  }

  async createTokenPair(
    data: {
      id: string | AutoIncrementID;
      sessionId: string | AutoIncrementID;
      hash: string;
    },
    config: TokenSigningConfig,
  ): Promise<AuthTokenPair> {
    const tokenExpires = Date.now() + ms(config.expiresIn as StringValue);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          id: String(data.id),
          sessionId: String(data.sessionId),
          hash: data.hash,
        },
        {
          secret: config.secret,
          expiresIn: config.expiresIn as StringValue,
        },
      ),
      this.jwtService.signAsync(
        {
          sessionId: String(data.sessionId),
          hash: data.hash,
        },
        {
          secret: config.refreshSecret,
          expiresIn: config.refreshExpiresIn as StringValue,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenExpires,
    } as AuthTokenPair;
  }

  verifyAccessToken(token: string, secret: string): JwtPayloadType {
    try {
      return this.jwtService.verify<JwtPayloadType>(token, { secret });
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  verifyRefreshToken(token: string, secret: string): JwtRefreshPayloadType {
    try {
      return this.jwtService.verify<JwtRefreshPayloadType>(token, { secret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
