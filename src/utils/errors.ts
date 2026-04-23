import { ErrorCode, fail, ErrorEnvelope } from '../types/toolContracts.js';
import { AxiosError } from 'axios';

/** Base class for all domain errors in azdo-mcp */
export class AzdoMcpError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'AzdoMcpError';
  }

  toEnvelope(): ErrorEnvelope {
    return fail(this.code, this.message, this.details, this.retryable);
  }
}

export class AuthRequiredError extends AzdoMcpError {
  constructor(msg = 'Authentication required') {
    super('AUTH_REQUIRED', msg, undefined, false);
  }
}

export class ForbiddenError extends AzdoMcpError {
  constructor(msg = 'Access denied') {
    super('FORBIDDEN', msg, undefined, false);
  }
}

export class NotFoundError extends AzdoMcpError {
  constructor(resource: string, id?: string | number) {
    super('NOT_FOUND', id ? `${resource} ${id} not found` : `${resource} not found`, undefined, false);
  }
}

export class ValidationError extends AzdoMcpError {
  constructor(msg: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', msg, details, false);
  }
}

export class ConflictError extends AzdoMcpError {
  constructor(msg: string) {
    super('CONFLICT', msg, undefined, false);
  }
}

export class RateLimitedError extends AzdoMcpError {
  constructor(msg = 'Rate limited by Azure DevOps') {
    super('RATE_LIMITED', msg, undefined, true);
  }
}

export class AzdoApiError extends AzdoMcpError {
  constructor(msg: string, details?: Record<string, unknown>, retryable = false) {
    super('AZDO_API_ERROR', msg, details, retryable);
  }
}

export class OrgUrlError extends AzdoMcpError {
  constructor(orgUrl?: string) {
    const hint = orgUrl
      ? `The configured org URL "${orgUrl}" returned a gateway error — it may be incorrect.`
      : 'No Azure DevOps org URL is configured.';
    super(
      'ORG_URL_ERROR',
      `${hint}\n\nRun the setup tool with the correct URL:\n  setup({ orgUrl: "https://dev.azure.com/your-org", enableDelete: false })`,
      { orgUrl },
      false,
    );
  }
}

/** Map an Axios error from the AzDO REST API to a typed domain error */
export function mapAxiosError(err: unknown): AzdoMcpError {
  if (!(err instanceof Error)) {
    return new AzdoMcpError('INTERNAL_ERROR', String(err));
  }

  const axErr = err as AxiosError<{ message?: string; typeKey?: string }>;

  if (!axErr.response) {
    // Network / timeout
    return new AzdoApiError(`Network error: ${axErr.message}`, undefined, true);
  }

  const status = axErr.response.status;
  const body = axErr.response.data;
  const apiMsg = body?.message ?? axErr.message;

  if (status === 401) return new AuthRequiredError(apiMsg);
  if (status === 403) return new ForbiddenError(apiMsg);
  if (status === 404) return new NotFoundError('resource', undefined);
  if (status === 409) return new ConflictError(apiMsg);
  if (status === 429) return new RateLimitedError(apiMsg);
  if (status === 502 || status === 503) {
    const url = axErr.config?.baseURL;
    return new OrgUrlError(url);
  }
  if (status >= 500) return new AzdoApiError(apiMsg, { status }, true);

  return new AzdoApiError(apiMsg, { status });
}
