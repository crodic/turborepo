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
  ADMIN_SUSPICIOUS_LOGIN = 'admin-suspicious-login',
  USER_EMAIL_VERIFICATION = 'user-email-verification',
  USER_EMAIL_FORGOT_PASSWORD = 'user-email-forgot-password',
  USER_IMPERSONATION_STARTED = 'user-impersonation-started',
  USER_IMPERSONATION_ENDED = 'user-impersonation-ended',
  ADMIN_SEND_EMAIL = 'admin-send-email',
  FILE_UPLOAD = 'file-upload',
}
