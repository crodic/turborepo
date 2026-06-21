export const groupPermission = [
  {
    group: 'USER',
    permissions: ['create', 'read', 'update', 'delete', 'impersonate'],
  },
  {
    group: 'ADMIN',
    permissions: ['create', 'read', 'update', 'delete'],
  },
  {
    group: 'ROLE',
    permissions: ['create', 'read', 'update', 'delete'],
  },
  {
    group: 'LOG',
    permissions: ['read'],
  },
  {
    group: 'IMPERSONATE_LOG',
    permissions: ['read'],
  },
  {
    group: 'EMAIL',
    permissions: ['create', 'read', 'update', 'delete'],
  },
  {
    group: 'EMAIL_LOG',
    permissions: ['read'],
  },
  {
    group: 'manage',
    permissions: ['all'],
  },
]

export const permissions = [
  // USER
  { action: 'create', subject: 'USER' },
  { action: 'read', subject: 'USER' },
  { action: 'update', subject: 'USER' },
  { action: 'delete', subject: 'USER' },
  { action: 'impersonate', subject: 'USER' },

  // ROLE
  { action: 'create', subject: 'ROLE' },
  { action: 'read', subject: 'ROLE' },
  { action: 'update', subject: 'ROLE' },
  { action: 'delete', subject: 'ROLE' },

  // ADMIN
  { action: 'create', subject: 'ADMIN' },
  { action: 'read', subject: 'ADMIN' },
  { action: 'update', subject: 'ADMIN' },
  { action: 'delete', subject: 'ADMIN' },

  // LOG
  { action: 'read', subject: 'LOG' },
  { action: 'read', subject: 'IMPERSONATE_LOG' },

  // EMAIL
  { action: 'create', subject: 'EMAIL' },
  { action: 'read', subject: 'EMAIL' },
  { action: 'update', subject: 'EMAIL' },
  { action: 'delete', subject: 'EMAIL' },
  { action: 'read', subject: 'EMAIL_LOG' },

  // SUPER
  { action: 'manage', subject: 'all' },
] as const

type Permission = (typeof permissions)[number]

export type Actions = Permission['action']
export type Subjects = Permission['subject']
