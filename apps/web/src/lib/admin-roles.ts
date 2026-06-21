type RoleId = string | number

export interface RoleLike {
  id?: RoleId | null
  name?: string | null
  permissions?: string[] | null
  permissionIds?: string[] | null
}

export interface AdminRoleLike {
  role?: RoleLike | null
  roles?: RoleLike[] | null
  permissions?: string[] | null
  roleId?: RoleId | null
  role_id?: RoleId | null
  roleIds?: RoleId[] | null
  role_ids?: RoleId[] | null
}

const toRoleId = (value: unknown): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  return undefined
}

export function getAdminRoles(admin?: AdminRoleLike | null): RoleLike[] {
  if (!admin) return []

  if (Array.isArray(admin.roles) && admin.roles.length > 0) {
    return admin.roles.filter(Boolean)
  }

  return admin.role ? [admin.role] : []
}

export function getAdminRoleIds(admin?: AdminRoleLike | null): string[] {
  if (!admin) return []

  const roleIds = [
    ...(Array.isArray(admin.roleIds) ? admin.roleIds : []),
    ...(Array.isArray(admin.role_ids) ? admin.role_ids : []),
    ...getAdminRoles(admin).map((role) => role.id),
    admin.roleId,
    admin.role_id,
  ]
    .map(toRoleId)
    .filter((value): value is string => Boolean(value))

  return [...new Set(roleIds)]
}

export function getAdminPermissions(admin?: AdminRoleLike | null): string[] {
  const permissions = [
    ...(Array.isArray(admin?.permissions) ? admin.permissions : []),
    ...getAdminRoles(admin).flatMap((role) =>
      Array.isArray(role.permissions) ? role.permissions : []
    ),
  ]

  return [...new Set(permissions)]
}

export function hasRole(
  admin: AdminRoleLike | null | undefined,
  roleCodeOrId: string | number
): boolean {
  const needle = String(roleCodeOrId)

  return (
    getAdminRoleIds(admin).includes(needle) ||
    getAdminRoles(admin).some((role) => role.name === needle)
  )
}

export function hasAnyRole(
  admin: AdminRoleLike | null | undefined,
  roles: Array<string | number>
): boolean {
  return roles.some((role) => hasRole(admin, role))
}

export function hasPermission(
  admin: AdminRoleLike | null | undefined,
  permission: string
): boolean {
  const permissions = getAdminPermissions(admin)

  return permissions.includes(permission) || permissions.includes('manage:all')
}

export function hasAnyPermission(
  admin: AdminRoleLike | null | undefined,
  permissions: string[]
): boolean {
  return permissions.some((permission) => hasPermission(admin, permission))
}
