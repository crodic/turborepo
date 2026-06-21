import z from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  type ApiMetadata,
  apiMetadataSchema,
  type PaginateQueryParams,
} from '@/global'
import http from '@/lib/http'
import {
  isAssignableRolePermission,
  permissionFormSchema,
  permissionSchema,
  type PermissionFormSchema,
  type PermissionSchema,
} from './schema'

async function apiGetPermissionListing(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: PermissionSchema[] }> {
  const response = await http.get('/permissions', { params })

  return apiMetadataSchema
    .extend({
      data: z.array(permissionSchema),
    })
    .parse(response.data)
}

async function apiPermissionFormOptions(): Promise<PermissionSchema[]> {
  const response = await http.get('/permissions/form-options')

  return permissionSchema
    .array()
    .parse(response.data)
    .filter(isAssignableRolePermission)
}

export async function apiGetPermissionById(id: string) {
  const response = await http.get(`/permissions/${id}`)

  return permissionSchema.parse(response.data)
}

export async function apiEditPermission({
  id,
  data,
}: {
  id: string
  data: PermissionFormSchema
}) {
  return await http.put(`/permissions/${id}`, permissionFormSchema.parse(data))
}

export const useDataPermissionOverview = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: ['permissions', params],
    queryFn: () => apiGetPermissionListing(params),
  })

export const useDataPermissionById = (id: string) =>
  useQuery({
    queryKey: ['permission', id],
    queryFn: () => apiGetPermissionById(id),
  })

export const useDataPermissionEdit = (id: string) =>
  useQuery({
    queryKey: ['permission', id],
    queryFn: () => apiGetPermissionById(id),
  })

export const useDataPermissionFormOptions = () =>
  useQuery({
    queryKey: ['permission_form_options'],
    queryFn: () => apiPermissionFormOptions(),
  })
