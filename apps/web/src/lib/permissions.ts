export const groupPermission = [
  {
    group: 'USER',
    permissions: ['create', 'read', 'update', 'delete'],
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
    group: 'EMAIL_LOG',
    permissions: ['read'],
  },
  {
    group: 'WHITE_LABEL',
    permissions: ['create', 'read', 'update', 'delete', 'publish'],
  },
  {
    group: 'FILE',
    permissions: ['create', 'read', 'update', 'delete'],
  },
  {
    group: 'PAGE',
    permissions: ['create', 'read', 'update', 'delete'],
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

  // EMAIL_LOG
  { action: 'read', subject: 'EMAIL_LOG' },

  // WHITE_LABEL
  { action: 'create', subject: 'WHITE_LABEL' },
  { action: 'read', subject: 'WHITE_LABEL' },
  { action: 'update', subject: 'WHITE_LABEL' },
  { action: 'delete', subject: 'WHITE_LABEL' },
  { action: 'publish', subject: 'WHITE_LABEL' },

  // FILE
  { action: 'create', subject: 'FILE' },
  { action: 'read', subject: 'FILE' },
  { action: 'update', subject: 'FILE' },
  { action: 'delete', subject: 'FILE' },

  // PAGE
  { action: 'create', subject: 'PAGE' },
  { action: 'read', subject: 'PAGE' },
  { action: 'update', subject: 'PAGE' },
  { action: 'delete', subject: 'PAGE' },

  // SUPER
  { action: 'manage', subject: 'all' },
] as const

type Permission = (typeof permissions)[number]

export type Actions = Permission['action']
export type Subjects = Permission['subject']
