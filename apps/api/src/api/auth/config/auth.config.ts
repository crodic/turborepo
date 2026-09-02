import { IsMs } from '@/decorators/validators/is-ms.decorator';
import validateConfig from '@/utils/validate-config';
import { registerAs } from '@nestjs/config';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { AuthConfig } from './auth-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  AUTH_JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  @IsMs()
  AUTH_JWT_TOKEN_EXPIRES_IN: string;

  @IsString()
  @IsNotEmpty()
  AUTH_REFRESH_SECRET: string;

  @IsString()
  @IsNotEmpty()
  @IsMs()
  AUTH_REFRESH_TOKEN_EXPIRES_IN: string;

  @IsString()
  @IsNotEmpty()
  AUTH_FORGOT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  @IsMs()
  AUTH_FORGOT_TOKEN_EXPIRES_IN: string;

  @IsString()
  @IsNotEmpty()
  AUTH_CONFIRM_EMAIL_SECRET: string;

  @IsString()
  @IsNotEmpty()
  @IsMs()
  AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN: string;

  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false })
  AUTH_PORTAL_URL?: string;

  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false })
  AUTH_PORTAL_RESET_PASSWORD_URL?: string;

  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false })
  AUTH_CLIENT_URL?: string;

  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false })
  AUTH_CLIENT_RESET_PASSWORD_URL?: string;

  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false })
  USER_AUTH_CLIENT_URL?: string;

  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false })
  USER_AUTH_CLIENT_RESET_PASSWORD_URL?: string;

  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false })
  GOOGLE_OAUTH_CALLBACK_URL?: string;

  @IsString()
  @IsOptional()
  ADMIN_PANEL_USERNAME?: string;

  @IsString()
  @IsOptional()
  ADMIN_PANEL_PASSWORD?: string;
}

export default registerAs<AuthConfig>('auth', () => {
  console.info(`Register AuthConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);

  const secret = process.env.AUTH_JWT_SECRET!;
  const expires = process.env.AUTH_JWT_TOKEN_EXPIRES_IN!;
  const refreshSecret = process.env.AUTH_REFRESH_SECRET!;
  const refreshExpires = process.env.AUTH_REFRESH_TOKEN_EXPIRES_IN!;
  const forgotSecret = process.env.AUTH_FORGOT_SECRET!;
  const forgotExpires = process.env.AUTH_FORGOT_TOKEN_EXPIRES_IN!;
  const confirmEmailSecret = process.env.AUTH_CONFIRM_EMAIL_SECRET!;
  const confirmEmailExpires = process.env.AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN!;

  return {
    secret,
    expires,
    refreshSecret,
    refreshExpires,
    forgotSecret,
    forgotExpires,
    confirmEmailSecret,
    confirmEmailExpires,
    portalUrl:
      process.env.AUTH_PORTAL_URL ||
      getOriginFromUrl(process.env.AUTH_PORTAL_RESET_PASSWORD_URL) ||
      'http://localhost:5173',
    portalResetPasswordUrl:
      process.env.AUTH_PORTAL_RESET_PASSWORD_URL ||
      'http://localhost:5173/reset-password',

    clientUrl:
      process.env.AUTH_CLIENT_URL ||
      process.env.USER_AUTH_CLIENT_URL ||
      getOriginFromUrl(
        process.env.AUTH_CLIENT_RESET_PASSWORD_URL ||
          process.env.USER_AUTH_CLIENT_RESET_PASSWORD_URL,
      ) ||
      'http://localhost:3000',
    clientResetPasswordUrl:
      process.env.AUTH_CLIENT_RESET_PASSWORD_URL ||
      process.env.USER_AUTH_CLIENT_RESET_PASSWORD_URL ||
      'http://localhost:3000/auth/reset-password',
    googleOAuthCallbackUrl: process.env.GOOGLE_OAUTH_CALLBACK_URL || '',

    adminPanelUsername: process.env.ADMIN_PANEL_USERNAME || 'admin',
    adminPanelPassword: process.env.ADMIN_PANEL_PASSWORD || 'change-me',
  };
});

function getOriginFromUrl(url?: string) {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}
