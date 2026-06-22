import { z } from 'zod'
import { blockDefinitions } from '@/lib/ui-builder/registry/block-definitions'
import { complexComponentDefinitions } from '@/lib/ui-builder/registry/complex-component-definitions'
import { primitiveComponentDefinitions } from '@/lib/ui-builder/registry/primitive-component-definitions'
import { shadcnComponentDefinitions } from '@/lib/ui-builder/registry/shadcn-component-definitions'
import type { ComponentRegistry } from '@/components/ui/ui-builder/types'

const semanticPrimitiveTypes = [
  'section',
  'main',
  'article',
  'header',
  'footer',
  'aside',
  'nav',
] as const

const semanticPrimitiveDefinitions = Object.fromEntries(
  semanticPrimitiveTypes.map((type) => [
    type,
    {
      schema: z.object({
        className: z.string().optional(),
        children: z.any().optional(),
        onClick: z.any().optional(),
      }),
      defaultChildren: [],
    },
  ])
) as ComponentRegistry

export const pageBuilderComponentRegistry = {
  ...primitiveComponentDefinitions,
  ...semanticPrimitiveDefinitions,
  ...complexComponentDefinitions,
  ...shadcnComponentDefinitions,
}

export const pageBuilderBlockRegistry = blockDefinitions
