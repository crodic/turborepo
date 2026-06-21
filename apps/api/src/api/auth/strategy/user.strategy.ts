import { SessionEntity } from '@/api/auth/entities/session.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { CacheKey } from '@/constants/cache.constant';
import { ESessionUserType } from '@/constants/entity.enum';
import { createCacheKey } from '@/utils/cache.util';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';

@Injectable()
export class UserJwtStrategy extends PassportStrategy(Strategy, 'user-jwt') {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<AllConfigType>('auth.userSecret', {
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
          userType: ESessionUserType.USER,
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

    const user = await this.userRepository.findOneBy({
      id: payload.id as AutoIncrementID,
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      ...payload,
      impersonatedBy: session?.impersonatedBy,
    };
  }
}
