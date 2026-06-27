import z from 'zod'

const nullableString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => value ?? null)

const nullableNumber = z
  .union([z.number(), z.null(), z.undefined()])
  .transform((value) => value ?? null)

const folderNamePattern = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,254}$/u

export const folderNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(folderNamePattern)

export const fileStatusSchema = z.enum(['active', 'archived'])

export const fileResourceTypeSchema = z.enum(['image', 'video', 'raw', 'file'])

export const fileSchema = z.object({
  id: z.string(),
  public_id: z.string(),
  folder: nullableString,
  original_name: z.string(),
  path: z.string(),
  hash: z.string(),
  mime: z.string(),
  size: z.number(),
  width: nullableNumber,
  height: nullableNumber,
  duration: nullableNumber,
  resource_type: z.string(),
  status: z.string(),
  url: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const folderSchema = z.object({
  folder: z.string(),
  count: z.number(),
  size: z.number(),
})

export const updateFileSchema = z.object({
  folder: folderNameSchema.nullable().optional(),
  status: fileStatusSchema.optional(),
})

export const createFolderSchema = z.object({
  folder: folderNameSchema,
})

export function isValidFolderName(folder: string) {
  return folderNameSchema.safeParse(folder).success
}

export type FileSchema = z.infer<typeof fileSchema>
export type FolderSchema = z.infer<typeof folderSchema>
export type UpdateFileSchema = z.infer<typeof updateFileSchema>
export type CreateFolderSchema = z.infer<typeof createFolderSchema>

export const ColumnKey = {
  originalName: 'original_name',
  folder: 'folder',
  resourceType: 'resource_type',
  mime: 'mime',
  status: 'status',
  size: 'size',
  dimensions: 'dimensions',
  createdAt: 'createdAt',
  actions: 'actions',
}
