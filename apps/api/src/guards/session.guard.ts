import { SessionEntity } from '@/api/session/entities/session.entity';
import { SessionService } from '@/api/session/session.service';
import { UserEntity } from '@/api/user/entities/user.entity';
import { IS_AUTH_OPTIONAL, IS_PUBLIC } from '@/constants/app.constant';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<
      Request & {
        user?: UserEntity & { sid?: string; sessionId?: string };
        session?: SessionEntity;
      }
    >();

    const isAuthOptional = this.reflector.getAllAndOverride<boolean>(
      IS_AUTH_OPTIONAL,
      [context.getHandler(), context.getClass()],
    );

    const sessionId = request.user?.sid ?? request.user?.sessionId;

    if (!sessionId) {
      if (isAuthOptional) return true;
      throw new UnauthorizedException(
        'Session identifier is missing from token',
      );
    }

    const session = await this.sessionService.getSessionById(sessionId);

    if (
      !session ||
      String(session.userId) !== String(request.user?.id) ||
      session.isRevoked
    ) {
      if (isAuthOptional) return true;
      throw new UnauthorizedException(
        'Session has expired or has been revoked',
      );
    }

    request.session = session;
    return true;
  }
}
