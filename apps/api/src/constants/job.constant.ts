export enum QueueName {
  EMAIL = 'email',
  FILE = 'file',
}

export enum QueuePrefix {
  AUTH = 'auth',
  FILE = 'file',
}

export enum JobName {
  EMAIL_VERIFICATION = 'email-verification',
  EMAIL_FORGOT_PASSWORD = 'email-forgot-password',
  ADMIN_EMAIL_VERIFICATION = 'admin-email-verification',
  ADMIN_EMAIL_FORGOT_PASSWORD = 'admin-email-forgot-password',
  USER_EMAIL_VERIFICATION = 'user-email-verification',
  USER_EMAIL_FORGOT_PASSWORD = 'user-email-forgot-password',
  ADMIN_ACCOUNT_DELETION_REQUESTED = 'admin-account-deletion-requested',
  ADMIN_ACCOUNT_HARD_DELETED = 'admin-account-hard-deleted',
  ADMIN_ACCOUNT_HARD_DELETED_REPORT = 'admin-account-hard-deleted-report',
  FILE_UPLOAD = 'file-upload',
}
