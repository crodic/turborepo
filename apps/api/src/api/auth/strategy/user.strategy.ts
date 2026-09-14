import { SessionEntity } from '@/api/auth/entities/session.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { AllConfigType } from '@/config/config.type';
import { ESessionUserType } from '@/constants/entity.enum';
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
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
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
      userType: ESessionUserType.USER,
      cache: this.cache,
      sessionRepository: this.sessionRepository,
      findUser: (id) => this.userRepository.findOneBy({ id }),
    });
  }
}
