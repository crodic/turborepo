import { SessionEntity } from '@/api/auth/entities/session.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { CacheKey } from '@/constants/cache.constant';
import { ESessionUserType } from '@/constants/entity.enum';
import { createCacheKey } from '@/utils/cache.util';
import { verifyPassword } from '@/utils/password.util';
import { Cache } from '@nestjs/cache-manager';
import { UnauthorizedException } from '@nestjs/common';
import { IsNull, Repository } from 'typeorm';
import { RefreshReqDto } from '../dto/refresh.req.dto';
import { RefreshResDto } from '../dto/refresh.res.dto';
import { IAuthAccount, IAuthUser } from '../interfaces/auth-entity.interface';
import { JwtPayloadType } from '../types/jwt-payload.type';
import { SessionRequestInfo } from '../types/session-request-info.type';
import { AuthSessionService } from './auth-session.service';
import {
  AuthTokenPair,
  AuthTokenService,
  TokenSigningConfig,
} from './auth-token.service';

export interface AuthConfig {
  userType: ESessionUserType;
  tokenConfig: TokenSigningConfig;
}

export abstract class AuthService<
  TUser extends IAuthUser,
  TAccount extends IAuthAccount,
> {
  constructor(
    protected readonly userRepository: Repository<TUser>,
    protected readonly sessionRepository: Repository<SessionEntity>,
    protected readonly authTokenService: AuthTokenService,
    protected readonly authSessionService: AuthSessionService,
    protected readonly cacheManager: Cache,
  ) {}

  protected abstract getAuthConfig(): AuthConfig;

  protected abstract findLocalAccount(
    userId: AutoIncrementID,
  ): Promise<TAccount | null>;

  protected abstract saveLocalAccountPassword(
    user: TUser,
    newPassword: string,
  ): Promise<TAccount>;

  protected async createLoginSessionAndTokens(
    userId: AutoIncrementID,
    requestInfo?: SessionRequestInfo,
  ): Promise<{ session: SessionEntity; tokens: AuthTokenPair }> {
    const config = this.getAuthConfig();
    const hash = this.authTokenService.generateSessionHash();

    const session = await this.authSessionService.createLoginSession({
      userId,
      userType: config.userType,
      hash,
      requestInfo,
    });

    const tokens = await this.authTokenService.createTokenPair(
      {
        id: userId,
        sessionId: session.id,
        hash: session.hash,
      },
      config.tokenConfig,
    );

    return { session, tokens };
  }

  async refreshToken(dto: RefreshReqDto): Promise<RefreshResDto> {
    const config = this.getAuthConfig();
    const { sessionId, hash } = this.authTokenService.verifyRefreshToken(
      dto.refreshToken,
      config.tokenConfig.refreshSecret,
    );

    const session = await this.sessionRepository.findOneBy({
      id: sessionId,
      userType: config.userType,
      revokedAt: IsNull(),
    });

    if (!session || session.hash !== hash) {
      throw new UnauthorizedException();
    }

    if (session.expiresAt && session.expiresAt <= new Date()) {
      await this.sessionRepository.update(session.id, {
        revokedAt: new Date(),
      });
      throw new UnauthorizedException();
    }

    const user = await this.userRepository.findOneOrFail({
      where: { id: session.userId } as any,
      select: ['id'] as any,
    });

    const newHash = this.authTokenService.generateSessionHash();

    await this.sessionRepository.update(
      {
        id: session.id,
        hash,
        userType: config.userType,
        revokedAt: IsNull(),
      },
      { hash: newHash },
    );

    return await this.authTokenService.createTokenPair(
      {
        id: user.id,
        sessionId: session.id,
        hash: newHash,
      },
      config.tokenConfig,
    );
  }

  async verifyAccessToken(token: string): Promise<JwtPayloadType> {
    const config = this.getAuthConfig();
    const payload = this.authTokenService.verifyAccessToken(
      token,
      config.tokenConfig.secret,
    );

    const isSessionBlacklisted = await this.cacheManager.get<boolean>(
      createCacheKey(CacheKey.SESSION_BLACKLIST, payload.sessionId),
    );

    if (isSessionBlacklisted) {
      throw new UnauthorizedException();
    }

    const session = await this.sessionRepository.findOneBy({
      id: payload.sessionId as AutoIncrementID,
      userId: payload.id as AutoIncrementID,
      userType: config.userType,
    });

    if (
      !session ||
      !payload.hash ||
      session.hash !== payload.hash ||
      session.revokedAt ||
      (session.expiresAt && session.expiresAt <= new Date())
    ) {
      throw new UnauthorizedException();
    }

    return payload;
  }

  protected async verifyLocalPassword(
    userId: AutoIncrementID,
    password: string,
  ): Promise<{ isValid: boolean; account: TAccount | null }> {
    const localAccount = await this.findLocalAccount(userId);
    const isValid = !!(
      localAccount &&
      localAccount.password &&
      (await verifyPassword(password, localAccount.password))
    );
    return { isValid, account: localAccount };
  }
}
