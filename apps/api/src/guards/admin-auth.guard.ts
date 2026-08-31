import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import { IS_AUTH_OPTIONAL, IS_PUBLIC } from '@/constants/app.constant';
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class AdminAuthGuard extends AuthGuard('admin-jwt') {
  constructor(
    private readonly cls: ClsService,
    private reflector: Reflector,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  handleRequest(err, user, info, context: ExecutionContext) {
    const isAuthOptional = this.reflector.getAllAndOverride<boolean>(
      IS_AUTH_OPTIONAL,
      [context.getHandler(), context.getClass()],
    );

    if (isAuthOptional && (err || !user)) {
      return null;
    }

    if (err || !user) {
      const message = info?.message || 'Unauthorized';
      throw new UnauthorizedException(message);
    }

    const request = context.switchToHttp().getRequest();
    request.user = user;

    this.cls.set('user', user);
    this.cls.set('userType', AdminUserEntity.name);

    return user;
  }
}
