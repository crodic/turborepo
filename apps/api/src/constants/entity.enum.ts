export enum ESessionUserType {
  ADMIN = 'AdminUserEntity',
  USER = 'UserEntity',
}

export enum EImpersonateLogStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

export enum EImpersonateHistoryStatus {
  ACTIVE = 'active',
  STOPPED = 'stopped',
}

export enum EEmailLogSource {
  SYSTEM = 'system',
  ADMIN = 'admin',
}

export enum EEmailLogStatus {
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum EOAuthProvider {
  GOOGLE = 'google',
}

export enum EThemeStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export enum EThemeTarget {
  ADMIN = 'admin',
  CLIENT = 'client',
}
