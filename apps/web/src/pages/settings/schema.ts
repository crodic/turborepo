import z from 'zod'
import { IMAGE_ACCEPTED_FORMATS, MAX_FILE_SIZE } from '@/global'

const WEBSITE_IMAGE_ACCEPTED_FORMATS = ['image/png', 'image/webp']
const WEBSITE_MAX_FILE_SIZE = 2 * 1024 * 1024

export const profileFormSchema = z.object({
  bio: z.string().max(160).min(4).nullish(),
  avatar: z.union([
    z
      .instanceof(File)
      .refine((file) => IMAGE_ACCEPTED_FORMATS.includes(file.type), {
        message: 'Unsupported file format',
      })
      .refine((file) => file.size <= MAX_FILE_SIZE, {
        message: 'File size must be less than 5MB',
      }),
    z.null(),
    z.undefined(),
  ]),
  removeAvatar: z.boolean().default(false).optional(),
})

export type ProfileFormSchema = z.infer<typeof profileFormSchema>

export const accountFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  birthday: z.string().nullable(),
  phone: z.string().optional(),
})

export type AccountFormSchema = z.infer<typeof accountFormSchema>

export const passwordFormSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmNewPassword: z
      .string()
      .min(8, 'Confirm Password must be at least 8 characters'),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmNewPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Passwords do not match',
        path: ['confirmNewPassword'],
      })
    }
  })

export type PasswordFormSchema = z.infer<typeof passwordFormSchema>

export const twoFactorPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type TwoFactorPasswordSchema = z.infer<typeof twoFactorPasswordSchema>

export const twoFactorVerifySchema = z.object({
  code: z
    .string()
    .min(6, 'Please enter your authentication code')
    .max(16, 'Authentication code is too long'),
})

export type TwoFactorVerifySchema = z.infer<typeof twoFactorVerifySchema>

const optionalImageFileSchema = z.union([
  z
    .instanceof(File)
    .refine((file) => WEBSITE_IMAGE_ACCEPTED_FORMATS.includes(file.type), {
      message: 'Only PNG and WebP files are supported',
    })
    .refine((file) => file.size <= WEBSITE_MAX_FILE_SIZE, {
      message: 'File size must be less than 2MB',
    }),
  z.null(),
  z.undefined(),
])

export const websiteSettingsSchema = z.object({
  site_brand: z.string().max(80).optional(),
  site_title: z.string().max(120).optional(),
  site_tagline: z.string().max(200).optional(),
  meta_title: z.string().max(120).optional(),
  meta_description: z.string().max(200).optional(),
  canonical_url: z.string().max(300).nullish(),
  og_title: z.string().max(120).optional(),
  og_description: z.string().max(300).optional(),
  og_image: z.string().nullish(),
  twitter_title: z.string().max(120).optional(),
  twitter_description: z.string().max(300).optional(),
  twitter_image: z.string().nullish(),
  site_logo: z.string().nullish(),
  site_dark_logo: z.string().nullish(),
  site_favicon: z.string().nullish(),
  backend_version: z.string().optional(),
})

export type WebsiteSettingsSchema = z.infer<typeof websiteSettingsSchema>

export const websiteSettingsFormSchema = z.object({
  site_brand: z.string().max(80, 'Brand must be at most 80 characters'),
  site_title: z.string().max(120, 'Title must be at most 120 characters'),
  site_tagline: z.string().max(200, 'Tagline must be at most 200 characters'),
  meta_title: z.string().max(120, 'Meta title must be at most 120 characters'),
  meta_description: z
    .string()
    .max(200, 'Meta description must be at most 200 characters'),
  canonical_url: z
    .string()
    .max(300, 'Canonical URL must be at most 300 characters'),
  og_title: z.string().max(120, 'OG title must be at most 120 characters'),
  og_description: z
    .string()
    .max(300, 'OG description must be at most 300 characters'),
  twitter_title: z
    .string()
    .max(120, 'Twitter title must be at most 120 characters'),
  twitter_description: z
    .string()
    .max(300, 'Twitter description must be at most 300 characters'),
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

export type WebsiteSettingsFormSchema = z.infer<
  typeof websiteSettingsFormSchema
>
