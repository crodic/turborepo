export enum QueueName {
  EMAIL = 'email',
}

export enum QueuePrefix {
  AUTH = 'auth',
}

export enum JobName {
  EMAIL_VERIFICATION = 'email-verification',
  EMAIL_FORGOT_PASSWORD = 'email-forgot-password',
  ADMIN_EMAIL_VERIFICATION = 'admin-email-verification',
  ADMIN_EMAIL_FORGOT_PASSWORD = 'admin-email-forgot-password',
  USER_EMAIL_VERIFICATION = 'user-email-verification',
  USER_EMAIL_FORGOT_PASSWORD = 'user-email-forgot-password',
  ADMIN_SEND_EMAIL = 'admin-send-email',
}
