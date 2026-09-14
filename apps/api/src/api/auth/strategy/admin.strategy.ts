import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { SessionEntity } from '@/api/auth/entities/session.entity';
import { AllConfigType } from '@/config/config.type';
import { ESessionUserType } from '@/constants/entity.enum';
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
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) =>
          extractCookieToken(request, getAuthCookieNames('admin').access),
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
      userType: ESessionUserType.ADMIN,
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
