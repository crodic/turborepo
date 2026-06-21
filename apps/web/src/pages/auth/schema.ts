import z from 'zod'

export const loginSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? 'Please enter your email' : undefined),
  }),
  password: z
    .string()
    .min(1, 'Please enter your password')
    .min(7, 'Password must be at least 7 characters long'),
})

export type LoginSchema = z.infer<typeof loginSchema>

export const twoFactorLoginSchema = z.object({
  code: z
    .string()
    .min(6, 'Please enter your authentication code')
    .max(16, 'Authentication code is too long'),
})

export type TwoFactorLoginSchema = z.infer<typeof twoFactorLoginSchema>

export const forgotPasswordSchema = z.object({
  email: z.email(),
})

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>

const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .max(20, { message: 'Password must be at most 20 characters' })
  .refine((password) => /[A-Z]/.test(password), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((password) => /[a-z]/.test(password), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((password) => /[0-9]/.test(password), {
    message: 'Password must be contain at least one number letter',
  })
  .refine((password) => /[!@#$%^&*]/.test(password), {
    message: 'Password must contain at least one special character (!@#$%^&*)',
  })

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z
      .string()
      .min(8, 'Confirm Password must be at least 8 characters'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>
