import { UserEntity } from '@/api/user/entities/user.entity';
import { UserService } from '@/api/user/user.service';
import { AutoIncrementID } from '@/common/types/common.type';
import { AllConfigType } from '@/config/config.type';
import { DomainType, UserStatus } from '@/constants/entity.enum';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  id?: string | AutoIncrementID;
  sub?: string | AutoIncrementID;
  email?: string;
  domain?: DomainType;
  sessionId?: string | AutoIncrementID;
  sid?: string | AutoIncrementID;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly userService: UserService,
    configService: ConfigService<AllConfigType>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => req?.cookies?.token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('auth.secret', { infer: true }),
    });
  }

  async validate(payload: JwtPayload): Promise<UserEntity & { sid: string }> {
    const userId = (payload.sub ?? payload.id) as AutoIncrementID;
    const sessionId = String(payload.sid ?? payload.sessionId);

    const user = await this.userService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Your account is inactive');
    }

    return Object.assign(user, { sid: sessionId });
  }
}
