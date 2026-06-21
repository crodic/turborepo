import http from '@/lib/http'
import {
  type PasswordFormSchema,
  type TwoFactorPasswordSchema,
  type TwoFactorVerifySchema,
  type WebsiteSettingsFormSchema,
  type WebsiteSettingsSchema,
  websiteSettingsSchema,
} from './schema'

export const WEBSITE_SETTINGS_QUERY_KEY = ['website_settings'] as const
export const WEBSITE_SETTINGS_KEY = 'website'
export const WEBSITE_SETTINGS_STORAGE_KEY = 'website_settings_cache'

export async function apiChangePassword(
  data: PasswordFormSchema
): Promise<PasswordFormSchema> {
  const response = await http.post('/admin-users/me/change-password', data)

  return response.data
}

export type TwoFactorStatus = {
  enabled: boolean
}

export type EnableTwoFactorResponse = {
  totpUri: string
  backupCodes: string[]
}

export async function apiGetTwoFactorStatus(): Promise<TwoFactorStatus> {
  const response = await http.get('/auth/me/2fa')

  return response.data
}

export async function apiEnableTwoFactor(
  data: TwoFactorPasswordSchema
): Promise<EnableTwoFactorResponse> {
  const response = await http.post('/auth/me/2fa/enable', data)

  return response.data
}

export async function apiVerifyTwoFactorSetup(
  data: TwoFactorVerifySchema
): Promise<TwoFactorStatus> {
  const response = await http.post('/auth/me/2fa/verify', data)

  return response.data
}

export async function apiDisableTwoFactor(
  data: TwoFactorPasswordSchema
): Promise<TwoFactorStatus> {
  const response = await http.post('/auth/me/2fa/disable', data)

  return response.data
}

export async function apiGenerateTwoFactorBackupCodes(
  data: TwoFactorPasswordSchema
): Promise<{ backupCodes: string[] }> {
  const response = await http.post('/auth/me/2fa/backup-codes', data)

  return response.data
}

export async function apiGetWebsiteSettings(): Promise<WebsiteSettingsSchema> {
  const response = await http.get(`/settings/${WEBSITE_SETTINGS_KEY}`)

  const settings = websiteSettingsSchema.parse(response.data)
  localStorage.setItem(WEBSITE_SETTINGS_STORAGE_KEY, JSON.stringify(settings))

  return settings
}

export async function apiUpdateWebsiteSettings(
  data: WebsiteSettingsFormSchema
): Promise<WebsiteSettingsSchema> {
  const formData = new FormData()

  formData.append('site_brand', data.site_brand ?? '')
  formData.append('site_title', data.site_title ?? '')
  formData.append('site_tagline', data.site_tagline ?? '')
  formData.append('remove_site_logo', String(data.remove_site_logo ?? false))
  formData.append(
    'remove_site_dark_logo',
    String(data.remove_site_dark_logo ?? false)
  )
  formData.append(
    'remove_site_favicon',
    String(data.remove_site_favicon ?? false)
  )

  if (data.site_logo instanceof File) {
    formData.append('site_logo', data.site_logo)
  }

  if (data.site_dark_logo instanceof File) {
    formData.append('site_dark_logo', data.site_dark_logo)
  }

  if (data.site_favicon instanceof File) {
    formData.append('site_favicon', data.site_favicon)
  }

  const response = await http.post(
    `/settings/${WEBSITE_SETTINGS_KEY}`,
    formData
  )

  const settings = websiteSettingsSchema.parse(response.data)
  localStorage.setItem(WEBSITE_SETTINGS_STORAGE_KEY, JSON.stringify(settings))

  return settings
}

export function getCachedWebsiteSettings(): WebsiteSettingsSchema | undefined {
  const value = localStorage.getItem(WEBSITE_SETTINGS_STORAGE_KEY)

  if (!value) {
    return undefined
  }

  try {
    const result = websiteSettingsSchema.safeParse(JSON.parse(value))

    return result.success ? result.data : undefined
  } catch {
    localStorage.removeItem(WEBSITE_SETTINGS_STORAGE_KEY)

    return undefined
  }
}
