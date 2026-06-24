import z from 'zod'
import { THEME_STYLE_KEYS } from '@/lib/theme-builder/default-theme'

const themeStylePropsSchema = z.object(
  Object.fromEntries(THEME_STYLE_KEYS.map((key) => [key, z.string().min(1)]))
)

const booleanishSchema = z.preprocess((value) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}, z.boolean())

export const themeStylesSchema = z.object({
  light: themeStylePropsSchema,
  dark: themeStylePropsSchema,
})

export const themeStatusSchema = z.enum(['draft', 'published'])
export const themeTargetSchema = z.enum(['admin', 'client'])

export const themeSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  styles: themeStylesSchema,
  status: themeStatusSchema,
  isDefault: booleanishSchema.default(false),
  isAdminDefault: booleanishSchema.default(false),
  isClientDefault: booleanishSchema.default(false),
  createdByAdminId: z.string().nullable().optional(),
  updatedByAdminId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const themeFormSchema = z.object({
  name: z.string().min(1, 'Theme name is required').max(120),
  description: z.string().nullish(),
  styles: themeStylesSchema,
  status: themeStatusSchema,
  isAdminDefault: z.boolean(),
  isClientDefault: z.boolean(),
})

export type ThemeSchema = z.infer<typeof themeSchema>
export type ThemeFormSchema = z.infer<typeof themeFormSchema>
export type ThemeTarget = z.infer<typeof themeTargetSchema>

export const ColumnKey = {
  name: 'name',
  slug: 'slug',
  status: 'status',
  runtime: 'runtime',
  updatedAt: 'updatedAt',
  colors: 'colors',
  actions: 'actions',
}
