/** Redact sensitive values from strings and objects before logging */

const SECRET_PATTERNS: RegExp[] = [
  // Bearer / Basic tokens in Authorization headers
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /Basic\s+[A-Za-z0-9+/]+=*/gi,
  // PAT-style base64 blobs (>=20 chars of base64)
  /[A-Za-z0-9+/]{20,}={0,2}/g,
];

const SENSITIVE_KEYS = new Set([
  'authorization',
  'token',
  'pat',
  'password',
  'secret',
  'credential',
  'access_token',
  'refresh_token',
]);

export function redactString(value: string): string {
  let result = value;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

export function redactObject(obj: unknown, depth = 0): unknown {
  if (depth > 10) return obj;
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') return redactString(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactObject(value, depth + 1);
      }
    }
    return result;
  }

  return obj;
}
