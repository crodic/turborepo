export type AuthConfig = {
  secret: string;
  expires: string;
  refreshSecret: string;
  refreshExpires: string;
  forgotSecret: string;
  forgotExpires: string;
  confirmEmailSecret: string;
  confirmEmailExpires: string;
  portalUrl: string;
  portalResetPasswordUrl: string;
  impersonationSessionExpires: string;

  userSecret: string;
  userExpires: string;
  userRefreshSecret: string;
  userRefreshExpires: string;
  userForgotSecret: string;
  userForgotExpires: string;
  userConfirmEmailSecret: string;
  userConfirmEmailExpires: string;
  clientUrl: string;
  clientResetPasswordUrl: string;
  googleOAuthCallbackUrl: string;

  adminPanelUsername: string;
  adminPanelPassword: string;
};
