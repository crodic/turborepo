import z from 'zod'
import { permissionSchema } from '../permissions/schema'

export enum DomainType {
  ADMIN = 'admin',
  CLIENT = 'client',
}

export const SYSTEM_ROLE_NAME = 'SUPER ADMIN'
export const CUSTOMER_ROLE_NAME = 'Customer'
export const SUPER_ADMIN_ROLE_CODE = 'super_admin'
export const CUSTOMER_ROLE_CODE = 'customer'

export const RESERVED_ROLE_NAMES = [SYSTEM_ROLE_NAME, CUSTOMER_ROLE_NAME]
export const RESERVED_ROLE_CODES = [SUPER_ADMIN_ROLE_CODE, CUSTOMER_ROLE_CODE]

export const ColumnKey = {
  name: 'name',
  code: 'code',
  domain: 'domain',
  description: 'description',
  permissions: 'permissions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  all: 'all',
}

export const roleSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  code: z.string().optional(),
  domain: z.nativeEnum(DomainType).default(DomainType.ADMIN),
  description: z.string().nullish(),
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
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
})

export const roleFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .refine((name) => !isReservedRoleName(name), {
      message: 'Role name is reserved',
    }),
  domain: z.nativeEnum(DomainType),
  description: z.string().nullish(),
  permissionIds: z
    .string()
    .array()
    .min(1, 'Please select one permission for role'),
})

export type RoleSchema = z.infer<typeof roleSchema>
export type RoleFormSchema = z.infer<typeof roleFormSchema>

export function isReservedRoleName(name: string) {
  const normalized = name.trim().toUpperCase()
  return (
    normalized === SYSTEM_ROLE_NAME.toUpperCase() ||
    normalized === CUSTOMER_ROLE_NAME.toUpperCase()
  )
}

export function isProtectedRole(
  role: Pick<RoleSchema, 'isSystem' | 'name'> &
    Partial<Pick<RoleSchema, 'code'>>
) {
  return (
    Boolean(role.isSystem) ||
    isReservedRoleName(role.name) ||
    (Boolean(role.code) && RESERVED_ROLE_CODES.includes(role.code as string))
  )
}
