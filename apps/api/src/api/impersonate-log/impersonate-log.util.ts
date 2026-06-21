const SENSITIVE_FIELD_NAMES = new Set([
  'password',
  'oldpassword',
  'newpassword',
  'confirmpassword',
  'passwordconfirmation',
  'newpasswordconfirmation',
  'token',
  'accesstoken',
  'refreshtoken',
  'otp',
  'twofactorsecret',
  'secret',
  'apikey',
  'authorization',
  'paymentcard',
]);

const MAX_AUDIT_JSON_BYTES = 20_000;
const MASKED_VALUE = '[REDACTED]';

export function isMutatingMethod(method?: string) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
    (method ?? '').toUpperCase(),
  );
}

export function sanitizePayload(payload: unknown): unknown {
  return protectJsonPayload(sanitizeValue(payload));
}

export function calculateChangedFields(
  before: unknown,
  after: unknown,
): string[] {
  if (!isPlainObject(before) || !isPlainObject(after)) {
    return JSON.stringify(before) === JSON.stringify(after) ? [] : ['$'];
  }

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changedFields: string[] = [];

  for (const key of keys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changedFields.push(key);
    }
  }

  return changedFields;
}

export function normalizeChangedFields(
  changedFields: unknown,
  before?: unknown,
  after?: unknown,
) {
  if (Array.isArray(changedFields)) {
    return changedFields.map(String);
  }

  if (changedFields && typeof changedFields === 'object') {
    return sanitizePayload(changedFields);
  }

  if (before !== undefined || after !== undefined) {
    return calculateChangedFields(before, after);
  }

  return [];
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        isSensitiveField(key) ? MASKED_VALUE : sanitizeValue(child),
      ]),
    );
  }

  return value;
}

function protectJsonPayload(value: unknown): unknown {
  const json = safeStringify(value);

  if (json.length <= MAX_AUDIT_JSON_BYTES) {
    return JSON.parse(json);
  }

  return {
    truncated: true,
    originalBytes: Buffer.byteLength(json),
    preview: json.slice(0, MAX_AUDIT_JSON_BYTES),
  };
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return JSON.stringify('[Unserializable payload]');
  }
}

function isSensitiveField(field: string) {
  const normalized = field.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  return (
    SENSITIVE_FIELD_NAMES.has(normalized) ||
    normalized.includes('password') ||
    normalized.includes('token') ||
    normalized.includes('secret') ||
    normalized.includes('apikey')
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date),
  );
}
