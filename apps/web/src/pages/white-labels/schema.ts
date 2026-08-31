import z from 'zod'
import { IMAGE_ACCEPTED_FORMATS } from '@/global'
import { THEME_STYLE_KEYS } from '@/lib/theme-builder/default-theme'

const WHITE_LABEL_IMAGE_ACCEPTED_FORMATS = [
  ...IMAGE_ACCEPTED_FORMATS,
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/svg+xml',
]
const WHITE_LABEL_MAX_FILE_SIZE = 5 * 1024 * 1024

const optionalImageFileSchema = z.union([
  z
    .instanceof(File)
    .refine((file) => WHITE_LABEL_IMAGE_ACCEPTED_FORMATS.includes(file.type), {
      message: 'Supported formats: PNG, WebP, JPEG, SVG, ICO',
    })
    .refine((file) => file.size <= WHITE_LABEL_MAX_FILE_SIZE, {
      message: 'File size must be less than 5MB',
    }),
  z.null(),
  z.undefined(),
])

const stylePropsSchema = z.object(
  Object.fromEntries(THEME_STYLE_KEYS.map((key) => [key, z.string().min(1)]))
)

export const whiteLabelStylesSchema = z.object({
  light: stylePropsSchema,
  dark: stylePropsSchema,
})

export const whiteLabelTargetSchema = z.enum(['admin', 'client'])

export const whiteLabelSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  target: whiteLabelTargetSchema,
  isActive: z.boolean().default(false),
  brandName: z.string().nullable().optional(),
  siteTitle: z.string().nullable().optional(),
  siteTagline: z.string().nullable().optional(),
  copyrightText: z.string().nullable().optional(),
  siteLogo: z.string().nullable().optional(),
  siteDarkLogo: z.string().nullable().optional(),
  siteFavicon: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  twitterImage: z.string().nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  styles: whiteLabelStylesSchema,
  createdByAdminId: z.string().nullable().optional(),
  updatedByAdminId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const activeWhiteLabelSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  target: whiteLabelTargetSchema,
  brandName: z.string().nullable().optional(),
  siteTitle: z.string().nullable().optional(),
  siteTagline: z.string().nullable().optional(),
  copyrightText: z.string().nullable().optional(),
  siteLogo: z.string().nullable().optional(),
  siteDarkLogo: z.string().nullable().optional(),
  siteFavicon: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  twitterImage: z.string().nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  styles: whiteLabelStylesSchema,
  updatedAt: z.string().optional(),
})

export const whiteLabelFormSchema = z.object({
  name: z.string().min(1, 'Profile name is required').max(120),
  description: z.string().max(300).nullish(),
  target: whiteLabelTargetSchema,
  isActive: z.boolean(),
  brandName: z.string().max(120).nullish(),
  siteTitle: z.string().max(255).nullish(),
  siteTagline: z.string().max(255).nullish(),
  copyrightText: z.string().max(255).nullish(),
  metaTitle: z.string().max(255).nullish(),
  metaDescription: z.string().max(500).nullish(),
  canonicalUrl: z.string().max(500).nullish(),
  styles: whiteLabelStylesSchema,
  site_logo: optionalImageFileSchema,
  site_dark_logo: optionalImageFileSchema,
  site_favicon: optionalImageFileSchema,
  og_image: optionalImageFileSchema,
  twitter_image: optionalImageFileSchema,
  remove_site_logo: z.boolean(),
  remove_site_dark_logo: z.boolean(),
  remove_site_favicon: z.boolean(),
  remove_og_image: z.boolean(),
  remove_twitter_image: z.boolean(),
})

export type WhiteLabelSchema = z.infer<typeof whiteLabelSchema>
export type ActiveWhiteLabelSchema = z.infer<typeof activeWhiteLabelSchema>
export type WhiteLabelFormSchema = z.infer<typeof whiteLabelFormSchema>
export type WhiteLabelTarget = z.infer<typeof whiteLabelTargetSchema>
export type WhiteLabelStyles = z.infer<typeof whiteLabelStylesSchema>

export const ColumnKey = {
  name: 'name',
  target: 'target',
  brandName: 'brandName',
  colors: 'colors',
  isActive: 'isActive',
  updatedAt: 'updatedAt',
  actions: 'actions',
}
