import { AppAbility } from '@/libs/casl/ability.factory';
import { SetMetadata } from '@nestjs/common';

export interface PolicyHandler {
  (ability: AppAbility): boolean;
}

export const CHECK_POLICIES_KEY = 'check_policies';
export const CHECK_ANY_POLICIES_KEY = 'check_any_policies';

export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);

export const CheckAnyPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_ANY_POLICIES_KEY, handlers);
