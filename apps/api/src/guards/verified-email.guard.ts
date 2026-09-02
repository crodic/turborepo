import {
  IS_AUTH_OPTIONAL,
  IS_PUBLIC,
  REQUIRE_VERIFIED_EMAIL,
} from '@/constants/app.constant';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    const isAuthOptional = this.reflector.getAllAndOverride<boolean>(
      IS_AUTH_OPTIONAL,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic || isAuthOptional) {
      return true;
    }

    const isRequired = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_VERIFIED_EMAIL,
      [context.getHandler(), context.getClass()],
    );

    if (!isRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.verifiedAt) {
      throw new ForbiddenException({
        code: 'UNVERIFIED_EMAIL',
        message: 'Your email address must be verified to access this resource.',
      });
    }

    return true;
  }
}
