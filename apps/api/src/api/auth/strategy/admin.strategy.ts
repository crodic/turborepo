import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { ESessionUserType } from '@/constants/entity.enum';
import { createCacheKey } from '@/utils/cache.util';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { getAuthCookieNames } from '../utils/auth-cookie.util';
import {
  extractCookieToken,
  extractMediaQueryToken,
} from '../utils/token-extractor.util';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) =>
          extractCookieToken(request, getAuthCookieNames('admin').access),
        extractMediaQueryToken,
      ]),
      secretOrKey: configService.getOrThrow<AllConfigType>('auth.secret', {
        infer: true,
      }),
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    const isSessionBlacklisted = payload.sessionId
      ? await this.cache.get<boolean>(
          createCacheKey(CacheKey.SESSION_BLACKLIST, payload.sessionId),
        )
      : false;

    if (isSessionBlacklisted) {
      throw new UnauthorizedException();
    }

    const session = payload.sessionId
      ? await this.sessionRepository.findOneBy({
          id: payload.sessionId as AutoIncrementID,
          userId: payload.id as AutoIncrementID,
          userType: ESessionUserType.ADMIN,
        })
      : null;

    if (
      !session ||
      !payload.hash ||
      session.hash !== payload.hash ||
      session.revokedAt ||
      (session.expiresAt && session.expiresAt <= new Date())
    ) {
      throw new UnauthorizedException();
    }

    const user = await this.adminUserRepository.findOne({
      where: { id: payload.id },
      relations: ['roles', 'roles.permissionEntities'],
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      ...user,
      sessionId: payload.sessionId,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
