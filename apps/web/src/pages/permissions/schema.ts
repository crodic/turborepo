import z from 'zod'

export const permissionSchema = z.object({
  id: z.string(),
  name: z.string(),
  group: z.string(),
  description: z.string().nullish(),
  key: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type PermissionSchema = z.infer<typeof permissionSchema>

export const ColumnKey = {
  key: 'key',
  name: 'name',
  group: 'group',
  updatedAt: 'updatedAt',
  actions: 'actions',
}

export const permissionFormSchema = z.object({
  group: z.string().min(1, 'Group is required'),
  description: z.string().nullish(),
})

export type PermissionFormSchema = z.infer<typeof permissionFormSchema>

export const FORBIDDEN_ROLE_PERMISSION_KEYS = ['manage:all']

export function isAssignableRolePermission(permission: PermissionSchema) {
  return !FORBIDDEN_ROLE_PERMISSION_KEYS.includes(permission.key)
}
