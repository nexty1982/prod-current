/**
 * Configuration Redaction Helper
 * Safely logs configuration without exposing secrets
 */

/**
 * Fields that should be redacted (never logged)
 */
const SECRET_FIELDS: string[] = [
  'password',
  'secret',
  'token',
  'key',
  'pass',
  'auth',
  'credential',
];

/**
 * Check if a field name should be redacted
 */
function shouldRedact(key) {
  const lowerKey = key.toLowerCase();
  return SECRET_FIELDS.some((secret) => lowerKey.includes(secret));
}

/**
 * Redact a value (replace with placeholder)
 */
function redactValue(value) {
  if (typeof value === 'string' && value.length > 0) {
    return `***${value.length} chars***`;
  }
  return '***';
}

/**
 * Recursively redact secrets from an object
 */
function redactObject(obj, depth = 0) {
  if (depth > 10) {
    return '[MAX DEPTH]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, depth + 1));
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (shouldRedact(key)) {
      redacted[key] = redactValue(value);
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactObject(value, depth + 1);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Create a redacted version of the config for logging
 */
export function redactConfig(config: any): any {
  return redactObject(config);
}

/**
 * Format config for console logging
 */
export function formatConfigForLog(config: any): string {
  const redacted = redactConfig(config);
  return JSON.stringify(redacted, null, 2);
}

// Also export as CommonJS for compatibility
module.exports = {
  redactConfig,
  formatConfigForLog,
};
