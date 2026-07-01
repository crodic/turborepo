export function getSuspiciousReasonKey(reason: string) {
  if (reason === 'new_ip_address') {
    return 'settings.security.sessionsSuspiciousNewIp'
  }

  if (reason === 'new_device') {
    return 'settings.security.sessionsSuspiciousNewDevice'
  }

  if (reason === 'failed_login_attempts') {
    return 'settings.security.sessionsSuspiciousFailedAttempts'
  }

  return 'settings.security.sessionsSuspicious'
}
