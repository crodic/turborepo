import { UserEntity } from '@/api/user/entities/user.entity';
import { IS_AUTH_OPTIONAL, IS_PUBLIC } from '@/constants/app.constant';
import { DomainType } from '@/constants/entity.enum';
import { DOMAIN_KEY } from '@/decorators/domain.decorator';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

@Injectable()
export class DomainGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: UserEntity }>();

    if (this.isAuthOptional(context) && !request.user) {
      return true;
    }

    const user = request.user;
    if (!user) {
      return true;
    }

    const requiredDomain = this.reflector.getAllAndOverride<DomainType>(
      DOMAIN_KEY,
      [context.getHandler(), context.getClass()],
    );

    this.validateDomain(user, requiredDomain);
    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false
    );
  }

  private isAuthOptional(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_AUTH_OPTIONAL, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false
    );
  }

  private validateDomain(user: UserEntity, requiredDomain?: DomainType): void {
    if (requiredDomain && user.domain !== requiredDomain) {
      throw new ForbiddenException(
        `Access denied. This endpoint requires domain '${requiredDomain}', but your account domain is '${user.domain}'`,
      );
    }
  }
}
