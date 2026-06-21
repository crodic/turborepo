import { complexComponentDefinitions } from '@/lib/ui-builder/registry/complex-component-definitions'
import { primitiveComponentDefinitions } from '@/lib/ui-builder/registry/primitive-component-definitions'

export const pageBuilderComponentRegistry = {
  ...primitiveComponentDefinitions,
  ...complexComponentDefinitions,
}
