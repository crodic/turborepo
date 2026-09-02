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

  clientUrl: string;
  clientResetPasswordUrl: string;
  googleOAuthCallbackUrl: string;

  adminPanelUsername: string;
  adminPanelPassword: string;
};
