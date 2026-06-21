import z from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  type ApiMetadata,
  apiMetadataSchema,
  type PaginateQueryParams,
} from '@/global'
import http from '@/lib/http'
import {
  type RoleFormSchema,
  roleSchema,
  type RoleSchema,
} from '../roles/schema'

async function apiGetRoleListing(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: RoleSchema[] }> {
  const response = await http.get('/roles', { params })

  return apiMetadataSchema
    .extend({
      data: z.array(roleSchema),
    })
    .parse(response.data)
}

async function apiRoleFormOptions(): Promise<RoleSchema[]> {
  const response = await http.get('/roles/form-options')

  return roleSchema.array().parse(response.data)
}

export async function apiDeleteRole(id: string) {
  return await http.delete(`/roles/${id}`)
}

export async function apiGetRoleById(id: string) {
  const response = await http.get(`/roles/${id}`)
  return roleSchema.parse(response.data)
}

export async function apiCreateRole(data: RoleFormSchema) {
  return await http.post('/roles', data)
}

export async function apiEditRole({
  id,
  data,
}: {
  id: string
  data: RoleFormSchema
}) {
  return await http.put(`/roles/${id}`, data)
}

export const useDataRoleOverview = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: ['roles', params],
    queryFn: () => apiGetRoleListing(params),
  })

export const useDataRoleById = (id: string) =>
  useQuery({
    queryKey: ['role', id],
    queryFn: () => apiGetRoleById(id),
  })

export const useDataRoleEdit = (id: string) =>
  useQuery({
    queryKey: ['role', id],
    queryFn: () => apiGetRoleById(id),
  })

export const useDataRoleFormOptions = () =>
  useQuery({
    queryKey: ['role_form_options'],
    queryFn: () => apiRoleFormOptions(),
  })
