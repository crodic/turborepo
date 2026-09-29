/**
 * Normalize user-agent header value.
 * Express may pass user-agent as string or string[] depending on proxy headers.
 * This helper always returns a single string.
 */
export function normalizeUserAgent(
  userAgent?: string | string[],
): string | undefined {
  return Array.isArray(userAgent) ? userAgent.join(', ') : userAgent;
}

/**
 * Normalize email for comparison: trim whitespace and lowercase.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
