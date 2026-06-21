import { AdminUserEntity } from '@/api/admin-user/entities/admin-user.entity';
import {
  IS_AUTH_OPTIONAL,
  IS_PUBLIC,
  SKIP_POLICIES,
} from '@/constants/app.constant';
import {
  CHECK_ANY_POLICIES_KEY,
  CHECK_POLICIES_KEY,
  PolicyHandler,
} from '@/decorators/policies.decorator';
import { CaslAbilityFactory } from '@/libs/casl/ability.factory';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslFactory: CaslAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    const isAuthOptional = this.reflector.getAllAndOverride<boolean>(
      IS_AUTH_OPTIONAL,
      [context.getHandler(), context.getClass()],
    );

    const isSkipPolicies = this.reflector.getAllAndOverride<boolean>(
      SKIP_POLICIES,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic || isAuthOptional || isSkipPolicies) return true;

    const policies =
      this.reflector.getAllAndOverride<PolicyHandler[]>(CHECK_POLICIES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    const anyPolicies =
      this.reflector.getAllAndOverride<PolicyHandler[]>(
        CHECK_ANY_POLICIES_KEY,
        [context.getHandler(), context.getClass()],
      ) || [];

    const decoratorsUsed = [policies.length > 0, anyPolicies.length > 0].filter(
      Boolean,
    ).length;

    if (decoratorsUsed > 1) {
      throw new InternalServerErrorException(
        'Only one policy decorator is allowed per route',
      );
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AdminUserEntity }>();

    const ability = this.caslFactory.createForUser(request.user);

    if (policies.length) {
      return policies.every((handler) => handler(ability));
    }

    if (anyPolicies.length) {
      return anyPolicies.some((handler) => handler(ability));
    }

    return true;
  }
}
