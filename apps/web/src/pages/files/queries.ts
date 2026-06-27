import z from 'zod'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
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

export const MANAGED_FILE_UPLOAD_MAX_SIZE = 500 * 1024 * 1024
export const FILE_UPLOAD_CHUNK_SIZE = 4 * 1024 * 1024

const chunkUploadSessionSchema = z.object({
  sessionId: z.string(),
  chunkSize: z.number(),
  totalChunks: z.number(),
  uploadedChunks: z.array(z.number()),
})

export const fileQueryKeys = {
  all: ['files'] as const,
  list: (params: PaginateQueryParams) => [...fileQueryKeys.all, params],
  infiniteList: (params: PaginateQueryParams) => [
    ...fileQueryKeys.all,
    'infinite',
    params,
  ],
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
  onProgress,
}: {
  file: File
  folder?: string | null
  onProgress?: (progress: number) => void
}) {
  return apiUploadFileInChunks({ file, folder, onProgress })
}

async function apiUploadFileInChunks({
  file,
  folder,
  onProgress,
}: {
  file: File
  folder?: string | null
  onProgress?: (progress: number) => void
}) {
  const totalChunks = Math.ceil(file.size / FILE_UPLOAD_CHUNK_SIZE)
  const sessionResponse = await http.post('/files/uploads/sessions', {
    originalName: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    folder,
    totalChunks,
    chunkSize: FILE_UPLOAD_CHUNK_SIZE,
  })
  const session = chunkUploadSessionSchema.parse(sessionResponse.data)

  try {
    for (let index = 0; index < totalChunks; index++) {
      const start = index * FILE_UPLOAD_CHUNK_SIZE
      const end = Math.min(start + FILE_UPLOAD_CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)
      const formData = new FormData()
      formData.append('chunk', chunk, `${file.name}.part-${index}`)
      formData.append('index', String(index))

      await http.post(`/files/uploads/${session.sessionId}/chunks`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          const chunkProgress = event.total ? event.loaded / event.total : 0
          const loaded = start + chunk.size * chunkProgress
          onProgress?.(Math.min(99, Math.round((loaded / file.size) * 100)))
        },
      })
    }

    const completeResponse = await http.post(
      `/files/uploads/${session.sessionId}/complete`
    )
    onProgress?.(100)

    return fileSchema.parse(completeResponse.data)
  } catch (error) {
    await http
      .delete(`/files/uploads/${session.sessionId}`)
      .catch(() => undefined)
    throw error
  }
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

export const useInfiniteDataFileOverview = (params: PaginateQueryParams) =>
  useInfiniteQuery({
    queryKey: fileQueryKeys.infiniteList(params),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiGetFileListing({
        ...params,
        page: pageParam,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.meta.currentPage < lastPage.meta.totalPages
        ? lastPage.meta.currentPage + 1
        : undefined,
  })

export const useDataFileFolders = () =>
  useQuery({
    queryKey: fileQueryKeys.folders,
    queryFn: apiGetFileFolders,
  })
