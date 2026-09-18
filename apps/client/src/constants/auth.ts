export const AUTH_CODE = {
  SESSION_EXPIRED: "session_expired",
  UNAUTHORIZED: "unauthorized",
  INVALID_TOKEN: "invalid_token",
} as const;

export type AuthCode = (typeof AUTH_CODE)[keyof typeof AUTH_CODE];

export const AUTH_QUERY_PARAM = {
  CODE: "code",
  FROM: "from",
} as const;

export type AuthQueryParam =
  (typeof AUTH_QUERY_PARAM)[keyof typeof AUTH_QUERY_PARAM];
