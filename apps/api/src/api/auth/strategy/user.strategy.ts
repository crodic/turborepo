import { UserSessionEntity } from '@/api/auth/entities/user-session.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { AllConfigType } from '@/config/config.type';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { getAuthCookieNames } from '../utils/auth-cookie.util';
import { extractCookieToken } from '../utils/token-extractor.util';
import { validateJwtSessionPayload } from './jwt.strategy';

@Injectable()
export class UserJwtStrategy extends PassportStrategy(Strategy, 'user-jwt') {
  constructor(
    configService: ConfigService<AllConfigType>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    @InjectRepository(UserSessionEntity)
    private readonly sessionRepository: Repository<UserSessionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) =>
          extractCookieToken(request, getAuthCookieNames('user').access),
      ]),
      secretOrKey: configService.getOrThrow<AllConfigType>('auth.userSecret', {
        infer: true,
      }),
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    return validateJwtSessionPayload({
      payload,
      cache: this.cache,
      sessionRepository: this.sessionRepository,
      findUser: (id) => this.userRepository.findOneBy({ id }),
    });
  }
}
