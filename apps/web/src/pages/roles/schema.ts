import z from 'zod'
import { permissionSchema } from '../permissions/schema'

export const SYSTEM_ROLE_NAME = 'SUPER ADMIN'

export const ColumnKey = {
  name: 'name',
  description: 'description',
  permissions: 'permissions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  all: 'all',
}

export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isSystem: z.boolean().optional().default(false),
  permissionIds: z.string().array().optional().default([]),
  permissions: z.string().array().optional().default([]),
  permissionDetails: z
    .array(
      permissionSchema.pick({
        id: true,
        name: true,
        group: true,
        description: true,
        key: true,
      })
    )
    .optional()
    .default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const roleFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .refine((name) => !isReservedRoleName(name), {
      message: `${SYSTEM_ROLE_NAME} is a reserved role name`,
    }),
  description: z.string().nullish(),
  permissionIds: z
    .string()
    .array()
    .min(1, 'Please select one permission for role'),
})

export type RoleSchema = z.infer<typeof roleSchema>
export type RoleFormSchema = z.infer<typeof roleFormSchema>

export function isReservedRoleName(name: string) {
  return name === SYSTEM_ROLE_NAME
}

export function isProtectedRole(role: Pick<RoleSchema, 'isSystem' | 'name'>) {
  return role.isSystem || isReservedRoleName(role.name)
}
