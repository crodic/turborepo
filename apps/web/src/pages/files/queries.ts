import z from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  type ApiMetadata,
  apiMetadataSchema,
  type PaginateQueryParams,
} from '@/global'
import http from '@/lib/http'
import {
  createFolderSchema,
  fileSchema,
  folderSchema,
  type CreateFolderSchema,
  type FileSchema,
  type UpdateFileSchema,
  updateFileSchema,
} from './schema'

export const fileQueryKeys = {
  all: ['files'] as const,
  list: (params: PaginateQueryParams) => [...fileQueryKeys.all, params],
  detail: (publicId: string) => [...fileQueryKeys.all, publicId],
  folders: ['file-folders'] as const,
}

export async function apiGetFileListing(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: FileSchema[] }> {
  const response = await http.get('/files', { params })

  return apiMetadataSchema
    .extend({ data: z.array(fileSchema) })
    .parse(response.data)
}

export async function apiGetFileByPublicId(publicId: string) {
  const response = await http.get(`/files/${publicId}`)
  return fileSchema.parse(response.data)
}

export async function apiUploadFile({
  file,
  folder,
}: {
  file: File
  folder?: string | null
}) {
  const formData = new FormData()
  formData.append('file', file)
  if (folder) {
    formData.append('folder', folder)
  }

  const response = await http.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return fileSchema.parse(response.data)
}

export async function apiUpdateFile({
  publicId,
  data,
}: {
  publicId: string
  data: UpdateFileSchema
}) {
  const response = await http.put(
    `/files/${publicId}`,
    updateFileSchema.parse(data)
  )

  return fileSchema.parse(response.data)
}

export async function apiDeleteFile(publicId: string) {
  return http.delete(`/files/${publicId}`)
}

export async function apiGetFileFolders() {
  const response = await http.get('/files/folders')
  return z.array(folderSchema).parse(response.data)
}

export async function apiCreateFolder(data: CreateFolderSchema) {
  const response = await http.post(
    '/files/folders',
    createFolderSchema.parse(data)
  )
  return folderSchema.parse(response.data)
}

export async function apiRenameFolder({
  folder,
  data,
}: {
  folder: string
  data: CreateFolderSchema
}) {
  const response = await http.put(
    `/files/folders/${encodeURIComponent(folder)}`,
    createFolderSchema.parse(data)
  )
  return folderSchema.parse(response.data)
}

export async function apiDeleteFolder({
  folder,
  deleteFiles = false,
}: {
  folder: string
  deleteFiles?: boolean
}) {
  return http.delete(`/files/folders/${encodeURIComponent(folder)}`, {
    params: { deleteFiles },
  })
}

export const useDataFileOverview = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: fileQueryKeys.list(params),
    queryFn: () => apiGetFileListing(params),
  })

export const useDataFileFolders = () =>
  useQuery({
    queryKey: fileQueryKeys.folders,
    queryFn: apiGetFileFolders,
  })
