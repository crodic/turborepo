import { useCallback, useEffect, useMemo, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { SearchIcon, ShieldCheckIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { FormItem } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  isAssignableRolePermission,
  type PermissionSchema,
} from '@/pages/permissions/schema'
import type { RoleFormSchema } from '../schema'

interface RolePermissionsFieldProps {
  form: UseFormReturn<RoleFormSchema>
  permissions: PermissionSchema[]
  disabled?: boolean
  isLoading?: boolean
  isError?: boolean
}

function getPermissionAction(permissionKey: string) {
  return permissionKey.split(':')[0] ?? permissionKey
}

function getSubjectLabel(subject: string) {
  return subject
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function RolePermissionsField({
  form,
  permissions,
  disabled = false,
  isLoading = false,
  isError = false,
}: RolePermissionsFieldProps) {
  const { t } = useTranslation()
  const [searchValue, setSearchValue] = useState('')
  const watchedPermissionIds = form.watch('permissionIds')
  const selectedPermissionIds = useMemo(
    () => watchedPermissionIds ?? [],
    [watchedPermissionIds]
  )

  const assignablePermissions = useMemo(
    () =>
      permissions.filter(isAssignableRolePermission).filter((permission) => {
        const keyword = searchValue.trim().toLowerCase()

        if (!keyword) return true

        return [
          permission.key,
          permission.name,
          permission.group,
          permission.description,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(keyword))
      }),
    [permissions, searchValue]
  )

  const assignablePermissionIds = useMemo(
    () =>
      new Set(
        permissions
          .filter(isAssignableRolePermission)
          .map((permission) => permission.id)
      ),
    [permissions]
  )

  const setPermissionIds = useCallback(
    (permissionIds: string[]) => {
      form.setValue('permissionIds', permissionIds, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    },
    [form]
  )

  useEffect(() => {
    if (isLoading || isError || permissions.length === 0) {
      return
    }

    const nextPermissionIds = selectedPermissionIds.filter((permissionId) =>
      assignablePermissionIds.has(permissionId)
    )

    if (nextPermissionIds.length !== selectedPermissionIds.length) {
      setPermissionIds(nextPermissionIds)
    }
  }, [
    assignablePermissionIds,
    isError,
    isLoading,
    permissions.length,
    selectedPermissionIds,
    setPermissionIds,
  ])

  const groupedPermissions = useMemo(() => {
    return assignablePermissions.reduce<Record<string, PermissionSchema[]>>(
      (groups, permission) => {
        const subject =
          permission.group || permission.key.split(':')[1] || 'Other'

        groups[subject] = [...(groups[subject] ?? []), permission]

        return groups
      },
      {}
    )
  }, [assignablePermissions])

  const handleGroupChange = (group: string, checked: boolean) => {
    const groupPermissionIds =
      groupedPermissions[group]?.map((permission) => permission.id) ?? []
    const current = new Set(selectedPermissionIds)

    groupPermissionIds.forEach((permissionId) => {
      if (checked) {
        current.add(permissionId)
      } else {
        current.delete(permissionId)
      }
    })

    setPermissionIds(Array.from(current))
  }

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    const current = new Set(selectedPermissionIds)

    if (checked) {
      current.add(permissionId)
    } else {
      current.delete(permissionId)
    }

    setPermissionIds(Array.from(current))
  }

  const isGroupChecked = (group: string) => {
    const groupPermissionIds =
      groupedPermissions[group]?.map((permission) => permission.id) ?? []

    return (
      groupPermissionIds.length > 0 &&
      groupPermissionIds.every((permissionId) =>
        selectedPermissionIds.includes(permissionId)
      )
    )
  }

  const selectedCount = selectedPermissionIds.length
  const availableCount = assignablePermissionIds.size

  const isPermissionChecked = (permissionId: string) => {
    return selectedPermissionIds.includes(permissionId)
  }

  return (
    <div className='col-span-3 space-y-2'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div className='space-y-1'>
          <h6
            className={cn(
              form.formState.errors.permissionIds && 'text-destructive',
              'font-semibold'
            )}
          >
            {t('roles.create.permissions')}
          </h6>
          <p className='text-muted-foreground text-sm'>
            Select the capabilities this role should have. Full system access is
            reserved and cannot be assigned here.
          </p>
        </div>

        <Badge variant='secondary' className='w-fit'>
          {selectedCount} of {availableCount} selected
        </Badge>
      </div>

      {isLoading ? (
        <div className='text-muted-foreground rounded-md border p-4 text-sm'>
          Loading permissions...
        </div>
      ) : isError ? (
        <div className='text-destructive rounded-md border p-4 text-sm'>
          Failed to load permissions
        </div>
      ) : assignablePermissions.length === 0 ? (
        <>
          <div className='relative'>
            <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder='Search permissions'
              className='ps-9'
              disabled={disabled}
            />
          </div>
          <div className='text-muted-foreground rounded-md border p-4 text-sm'>
            No permissions available
          </div>
        </>
      ) : (
        <>
          <div className='relative'>
            <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder='Search permissions'
              className='ps-9'
              disabled={disabled}
            />
          </div>

          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3'>
            {Object.entries(groupedPermissions).map(
              ([group, groupPermissions]) => {
                const groupSelectedCount = groupPermissions.filter(
                  (permission) => selectedPermissionIds.includes(permission.id)
                ).length

                return (
                  <div
                    key={group}
                    className='bg-card/50 overflow-hidden rounded-lg border'
                  >
                    <div className='bg-muted/40 flex items-center justify-between gap-3 border-b p-4'>
                      <FormItem className='flex items-center gap-3 space-y-0'>
                        <Checkbox
                          checked={isGroupChecked(group)}
                          onCheckedChange={(checked) =>
                            handleGroupChange(group, Boolean(checked))
                          }
                          disabled={disabled}
                        />
                        <div className='space-y-0.5'>
                          <label className='font-semibold'>
                            {getSubjectLabel(group)}
                          </label>
                          <p className='text-muted-foreground text-xs'>
                            {groupSelectedCount}/{groupPermissions.length}{' '}
                            permissions selected
                          </p>
                        </div>
                      </FormItem>
                      <ShieldCheckIcon className='text-muted-foreground size-4' />
                    </div>

                    <div className='max-h-[348px] divide-y overflow-y-auto'>
                      {groupPermissions.map((permission) => (
                        <FormItem
                          key={permission.id}
                          className='hover:bg-muted/30 flex items-start gap-3 space-y-0 p-4 transition-colors'
                        >
                          <Checkbox
                            checked={isPermissionChecked(permission.id)}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(
                                permission.id,
                                Boolean(checked)
                              )
                            }
                            disabled={disabled}
                            className='mt-1'
                          />
                          <div className='min-w-0 flex-1 space-y-1'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <label className='font-medium'>
                                {permission.name}
                              </label>
                              <Badge
                                variant='outline'
                                className='font-mono text-[11px]'
                              >
                                {getPermissionAction(permission.key)}
                              </Badge>
                            </div>
                            {permission.description && (
                              <p className='text-muted-foreground text-sm leading-relaxed'>
                                {permission.description}
                              </p>
                            )}
                          </div>
                        </FormItem>
                      ))}
                    </div>
                  </div>
                )
              }
            )}
          </div>
        </>
      )}

      {form.formState.errors.permissionIds && (
        <p className='text-sm text-red-500'>
          {form.formState.errors.permissionIds.message}
        </p>
      )}
    </div>
  )
}
