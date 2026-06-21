export type AuthConfig = {
  secret: string;
  expires: string;
  refreshSecret: string;
  refreshExpires: string;
  forgotSecret: string;
  forgotExpires: string;
  confirmEmailSecret: string;
  confirmEmailExpires: string;
  portalResetPasswordUrl: string;

  userSecret: string;
  userExpires: string;
  userRefreshSecret: string;
  userRefreshExpires: string;
  userForgotSecret: string;
  userForgotExpires: string;
  userConfirmEmailSecret: string;
  userConfirmEmailExpires: string;
  clientResetPasswordUrl: string;

  adminPanelUsername: string;
  adminPanelPassword: string;
};
