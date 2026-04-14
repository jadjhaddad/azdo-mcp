/** MCP tool response envelope and shared contract types */

export interface SuccessEnvelope<T = unknown> {
  ok: true;
  data: T;
}

export interface ErrorEnvelope {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    retryable: boolean;
  };
}

export type ToolEnvelope<T = unknown> = SuccessEnvelope<T> | ErrorEnvelope;

export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'AZDO_API_ERROR'
  | 'INTERNAL_ERROR';

export function ok<T>(data: T): SuccessEnvelope<T> {
  return { ok: true, data };
}

export function fail(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  retryable = false,
): ErrorEnvelope {
  return { ok: false, error: { code, message, details, retryable } };
}
