import { AbilityBuilder, type AbilityClass, PureAbility } from '@casl/ability'
import type { Actions, Subjects } from './permissions'

export type AppAbilityType = [Actions, Subjects]
export type AppAbility = PureAbility<AppAbilityType>
export const AppAbilityClass = PureAbility as AbilityClass<AppAbility>

export interface Claim {
  action: Actions
  subject: Subjects
}

export function defineAbilityFor(claims: Claim[]): AppAbility {
  const builder = new AbilityBuilder(AppAbilityClass)

  for (const claim of claims) {
    builder.can(claim.action, claim.subject)
  }

  return builder.build()
}
