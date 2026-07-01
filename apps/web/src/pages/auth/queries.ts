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
  impersonatedBy: z.string().nullish(),
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

export const impersonateUserSchema = z.object({
  userId: z.string(),
  impersonatedBy: z.string(),
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenExpires: z.number(),
  expiresAt: z.string(),
  callbackUrl: z.string().nullish(),
  redirectUrl: z.string().nullish(),
  session: sessionSchema,
})

export type ImpersonateUserResponse = z.infer<typeof impersonateUserSchema>

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

export async function apiRevokeSession(id: string) {
  return await http.delete(`/auth/sessions/${id}`)
}

export async function apiRevokeAllSessions() {
  return await http.delete('/auth/sessions')
}

export async function apiImpersonateUser(data: {
  userId: string
  reason: string
  callbackUrl?: string
}): Promise<ImpersonateUserResponse> {
  const res = await http.post('/auth/impersonate-user', data)

  return impersonateUserSchema.parse(res.data)
}

export async function apiGetActiveUserImpersonationSession(
  userId: string
): Promise<SessionSchema | null> {
  const res = await http.get(`/auth/impersonate-user/${userId}/active-session`)

  return res.data ? sessionSchema.parse(res.data) : null
}

export async function apiStopUserImpersonation(userId: string) {
  return await http.post(`/auth/impersonate-user/${userId}/stop`)
}
