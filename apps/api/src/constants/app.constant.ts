export const IS_PUBLIC = 'isPublic';
export const IS_AUTH_OPTIONAL = 'isAuthOptional';
export const SKIP_POLICIES = 'skipPolicies';

export enum Environment {
  LOCAL = 'local',
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

export enum LogService {
  CONSOLE = 'console',
  GOOGLE_LOGGING = 'google_logging',
  AWS_CLOUDWATCH = 'aws_cloudwatch',
}

export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum Storage {
  LOCAL = 'local',
  PUBLIC = 'public',
  S3 = 's3',
  gcs = 'gcs',
}

// Redact value of these paths from logs
export const loggingRedactPaths = [
  'req.headers.authorization',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.email',
  'req.body.password',
  'req.body.oldPassword',
];

export const DEFAULT_PAGE_LIMIT = 10;
export const DEFAULT_CURRENT_PAGE = 1;
export const SYSTEM_USER_ID = 'system';
export const SYSTEM_ROLE_NAME = 'SUPER ADMIN';
export const SUPER_ADMIN_ACCOUNT = {
  email: 'admin@email.com',
  password: 'admin@2025',
};
