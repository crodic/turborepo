import z from 'zod'
import http from '@/lib/http'
import { adminSchema, type AdminSchema } from '../admins/schema'
import {
  type AccountFormSchema,
  type NotificationsFormSchema,
  type ProfileFormSchema,
} from '../settings/schema'
import {
  type ResetPasswordSchema,
  type LoginSchema,
  type TwoFactorLoginSchema,
  type SuspiciousLoginSchema,
} from './schema'

export const sessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userType: z.string(),

  ipAddress: z.string().nullish(),
  userAgent: z.string().nullish(),
  isSuspicious: z.boolean().default(false),
  suspiciousReasons: z
    .array(z.enum(['new_ip_address', 'new_device', 'failed_login_attempts']))
    .nullish()
    .default([]),
  expiresAt: z.string().nullish(),
  revokedAt: z.string().nullish(),
  createdAt: z.string(),
  isCurrent: z.boolean().default(false),
})

export type SessionSchema = z.infer<typeof sessionSchema>

export interface ApiLoginResponse {
  accessToken?: string
  refreshToken?: string
  userId: string
  tokenExpires?: number
  twoFactorRequired?: boolean
  twoFactorToken?: string
  twoFactorMethods?: string[]
  suspiciousLoginRequired?: boolean
  suspiciousLoginToken?: string
  suspiciousLoginMethods?: string[]
  suspiciousReasons?: string[]
  restoreAccountRequired?: boolean
  restoreToken?: string
}

export async function apiLogin(values: LoginSchema): Promise<ApiLoginResponse> {
  const res = await http.post('/auth/login', values)

  return res.data
}

export async function apiVerifyTwoFactorLogin(
  values: TwoFactorLoginSchema & { twoFactorToken: string }
): Promise<ApiLoginResponse> {
  const res = await http.post('/auth/2fa/verify-login', values)

  return res.data
}

export async function apiVerifySuspiciousLogin(
  values: SuspiciousLoginSchema & { suspiciousLoginToken: string }
): Promise<ApiLoginResponse> {
  const res = await http.post('/auth/suspicious-login/verify', values)

  return res.data
}

export async function apiResendVerifyEmail(values: { email: string }) {
  const res = await http.post('/auth/verify/resend', values)

  return res.data
}

export async function apiSignOut(token?: string) {
  const res = await http.post(`/auth/logout`, { token })

  return res
}

export async function apiRefreshToken(token: string) {
  const res = await http.post('/auth/refresh', { refreshToken: token })

  return res.data
}

export async function apiGetMe(): Promise<AdminSchema> {
  const res = await http.get('/auth/me')

  return adminSchema.parse(res.data)
}

export async function apiForgotPassword(email: string) {
  return await http.post(`/auth/forgot-password`, { email })
}

export async function apiResetPassword(
  data: ResetPasswordSchema,
  token: string
) {
  return await http.post(`/auth/reset-password?token=${token}`, {
    password: data.newPassword,
    confirmPassword: data.confirmPassword,
  })
}

export async function apiUpdateMe(data: ProfileFormSchema) {
  return await http.put('/auth/me', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export async function apiUpdateCurrentAccount(data: AccountFormSchema) {
  return await http.put('/auth/me', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export async function apiUpdateNotificationSettings(
  data: NotificationsFormSchema
) {
  return await http.put('/auth/me', data)
}

export async function apiGetSessions(): Promise<SessionSchema[]> {
  const res = await http.get('/auth/sessions')

  return z.array(sessionSchema).parse(res.data)
}

export const loginActivitySchema = z.object({
  totalSessions: z.number(),
  activeDays: z.number(),
  data: z.array(
    z.object({
      date: z.string(),
      count: z.number(),
      level: z.number(),
    })
  ),
})

export type LoginActivitySchema = z.infer<typeof loginActivitySchema>

export async function apiGetLoginActivity(): Promise<LoginActivitySchema> {
  const res = await http.get('/auth/sessions/activity')
  return loginActivitySchema.parse(res.data)
}

export async function apiRevokeSession(id: string) {
  return await http.delete(`/auth/sessions/${id}`)
}

export async function apiRevokeAllSessions() {
  return await http.delete('/auth/sessions')
}

export async function apiRestoreAccount(values: {
  token: string
}): Promise<ApiLoginResponse> {
  const res = await http.post('/auth/restore', values)

  return res.data
}

export async function apiDeleteAccount() {
  return await http.delete('/auth/me/account')
}
