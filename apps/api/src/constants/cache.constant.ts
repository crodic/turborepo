export enum CacheKey {
  SESSION_BLACKLIST = 'auth:session-blacklist:%s', // %s: sessionId
  SESSION_DATA = 'auth:session-data:%s', // %s: sessionId
  SESSION_GRACE_HASH = 'auth:session-grace:%s:%s', // %s: sessionId, %s: hash
  USER_DATA = 'auth:user-data:%s', // %s: userId
  TWO_FACTOR_SETUP = 'auth:two-factor-setup:%s', // %s: userId
  EMAIL_VERIFICATION = 'auth:token:%s:email-verification', // %s: userId
  PASSWORD_RESET = 'auth:token:%s:password', // %s: userId
  SOCIAL_OAUTH_STATE = 'auth:social:state:%s', // %s: state
  SOCIAL_OAUTH_EXCHANGE = 'auth:social:exchange:%s', // %s: exchange token
  SYSTEM_HAS_ADMIN = 'system:hasAdmin',
  SYSTEM_HAS_ROLE = 'system:hasRole',
  FORGOT_PASSWORD = 'auth:token:%s:forgot-password', // %s: userId
}
