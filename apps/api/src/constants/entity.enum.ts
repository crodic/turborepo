export enum DomainType {
  CLIENT = 'client',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
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
  FACEBOOK = 'facebook',
  GITHUB = 'github',
}

export enum EOAuthProvider {
  GOOGLE = 'google',
}

export enum EWhiteLabelTarget {
  ADMIN = 'admin',
  CLIENT = 'client',
}
