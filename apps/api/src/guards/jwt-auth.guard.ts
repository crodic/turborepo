import { IS_AUTH_OPTIONAL, IS_PUBLIC } from '@/constants/app.constant';
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext): any {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  override handleRequest(
    err: any,
    user: any,
    _info: any,
    context: ExecutionContext,
  ): any {
    const isAuthOptional = this.reflector.getAllAndOverride<boolean>(
      IS_AUTH_OPTIONAL,
      [context.getHandler(), context.getClass()],
    );

    if (isAuthOptional) {
      return user ?? null;
    }

    if (err) {
      throw err instanceof Error ? err : new UnauthorizedException(String(err));
    }

    if (!user) {
      throw new UnauthorizedException(
        'Authentication token is invalid or missing',
      );
    }

    return user;
  }
}
