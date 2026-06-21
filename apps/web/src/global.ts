import { z } from 'zod'

export const CURRENT_PAGE = 1
export const PER_PAGE = 10
export const MAX_FILE_SIZE = 5 * 1024 * 1024
export const MAX_IMAGE_SIZE_MB = 1
export const IMAGE_ACCEPTED_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
]

export const fileUploadSingleSchema = z.object({
  files: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: 'File size must be less than 1MB',
      path: ['files'],
    })
    .refine((file) => IMAGE_ACCEPTED_FORMATS.includes(file.type), {
      message: `File type must be one of ${IMAGE_ACCEPTED_FORMATS.join(', ')}`,
      path: ['files'],
    }),
})

interface FilterObject {
  [key: string]: string | number | boolean | FilterObject | (string | number)[]
}

export type PaginateQueryParams = {
  /** Number of items per page */
  limit?: number

  /** Page number (for page-based pagination) */
  page?: number

  /** Cursor string (for cursor-based pagination) */
  cursor?: string

  /** Sorting string in the format "column:ASC|DESC" */
  sortBy?: string

  /** Global search keyword */
  search?: string

  /** List of fields to select */
  select?: string[]

  /** Include soft-deleted items */
  withDeleted?: boolean

  /** Relations to include */
  with?: string[]

  /** Filter object, supports nested relations and array values for $in */
  filter?: FilterObject

  [key: string]: any
}

export const apiMetaSchema = z.object({
  itemsPerPage: z.number(),
  totalItems: z.number(),
  currentPage: z.number(),
  totalPages: z.number(),
  sortBy: z.array(z.tuple([z.string(), z.string()])),
  search: z.string().nullable().optional(),
  filter: z.record(z.string(), z.any()).optional(),
})

export const apiLinksSchema = z.object({
  first: z.string().optional().nullable(),
  previous: z.string().optional().nullable(),
  current: z.string(),
  next: z.string().optional().nullable(),
  last: z.string().optional().nullable(),
})

export const apiMetadataSchema = z.object({
  meta: apiMetaSchema,
  links: apiLinksSchema,
})

export type ApiMeta = z.infer<typeof apiMetaSchema>
export type ApiLinks = z.infer<typeof apiLinksSchema>
export type ApiMetadata = z.infer<typeof apiMetadataSchema>
