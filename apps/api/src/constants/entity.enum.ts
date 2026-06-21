export enum ESessionUserType {
  ADMIN = 'AdminUserEntity',
  USER = 'UserEntity',
}

export enum EImpersonateLogStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
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
