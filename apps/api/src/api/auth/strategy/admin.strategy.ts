import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { AdminSessionEntity } from '@/api/auth/entities/admin-session.entity';
import { AllConfigType } from '@/config/config.type';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
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
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    configService: ConfigService<AllConfigType>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(AdminSessionEntity)
    private readonly sessionRepository: Repository<AdminSessionEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) =>
          extractCookieToken(request, getAuthCookieNames('admin').access),
        (request: Request) => {
          // Native browser EventSource cannot send Authorization headers;
          // allow query parameter token ONLY for notification stream endpoint.
          const url = request?.originalUrl || request?.url || '';
          if (url.includes('/notifications/stream')) {
            return ExtractJwt.fromUrlQueryParameter('token')(request);
          }
          return null;
        },
      ]),
      secretOrKey: configService.getOrThrow<AllConfigType>('auth.secret', {
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
      findUser: (id) =>
        this.adminUserRepository.findOne({
          where: { id },
          relations: ['roles', 'roles.permissionEntities'],
        }),
    });
  }
}
