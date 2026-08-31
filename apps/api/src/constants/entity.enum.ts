export enum ESessionUserType {
  ADMIN = 'AdminUserEntity',
  USER = 'UserEntity',
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

export enum EAccountProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

export enum EOAuthProvider {
  GOOGLE = 'google',
}

export enum EWhiteLabelTarget {
  ADMIN = 'admin',
  CLIENT = 'client',
}
