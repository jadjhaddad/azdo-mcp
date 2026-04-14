import pino from 'pino';
import { redactObject } from './redact.js';

const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';

/**
 * Structured logger with automatic redaction of sensitive fields.
 * All log output goes to stderr so stdout stays clean for MCP stdio transport.
 */
export const logger = pino({
  level: LOG_LEVEL,
  destination: 2, // stderr fd
  serializers: {
    err: pino.stdSerializers.err,
  },
});

/** Audit log — always info level, structured, never redacted (caller must pre-sanitize). */
export function auditLog(entry: {
  actor: string;
  action: string;
  targetId?: string | number;
  project?: string;
  status: 'success' | 'failure';
  details?: Record<string, unknown>;
}): void {
  logger.info({ audit: true, ...entry }, 'audit');
}

/** Safe log helper — redacts sensitive values before emitting. */
export function safeLog(
  level: 'debug' | 'info' | 'warn' | 'error',
  msg: string,
  context?: Record<string, unknown>,
): void {
  const safe = context ? (redactObject(context) as Record<string, unknown>) : undefined;
  logger[level](safe ?? {}, msg);
}
