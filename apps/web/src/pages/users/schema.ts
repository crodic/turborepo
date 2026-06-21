import z from 'zod'

export const ColumnKey = {
  id: 'id',
  email: 'email',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  avatar: 'avatar',
  verifiedAt: 'verifiedAt',
  fullName: 'fullName',
  all: 'all',
}

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  avatar: z.string().nullish(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  fullName: z.string(),
  verifiedAt: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type UserSchema = z.infer<typeof userSchema>

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

export const userCreateSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().optional(),
    email: z.email('Invalid email address'),
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(8, 'Confirm Password must be at least 8 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type UserCreateSchema = z.infer<typeof userCreateSchema>

export const userEditSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.email('Invalid email address'),
})

export type UserEditSchema = z.infer<typeof userEditSchema>
