/**
 * Auth adapter — token is injected externally (env var, host layer, or per-session context).
 * When a 401 is returned by AzDO, callers surface AUTH_REQUIRED so the host
 * can inject a fresh token and retry.  No tokens are stored, cached, or returned in output.
 */
import { getEnv } from '../config/env.js';
import { AuthRequiredError } from '../utils/errors.js';

export interface AuthContext {
  /** Pre-built Authorization header value — never log this */
  authHeader: string;
  /** Display-safe identity hint (email/UPN) — may be empty for PATs */
  actorHint: string;
}

/**
 * Resolve auth context from environment.
 * Supports:
 *   - PAT (Personal Access Token): passed via AZDO_TOKEN — encoded as Basic :<pat>
 *   - Bearer token: if AZDO_TOKEN starts with "Bearer " it is used as-is
 *
 * Throws AuthRequiredError when no token is configured so callers get a clean
 * AUTH_REQUIRED envelope and know to re-inject credentials.
 */
export function resolveAuth(): AuthContext {
  let token: string;
  try {
    token = getEnv().AZDO_TOKEN;
  } catch {
    throw new AuthRequiredError('AZDO_TOKEN not configured');
  }

  if (!token) {
    throw new AuthRequiredError('AZDO_TOKEN is empty — re-inject a valid token');
  }

  // Bearer token passed directly (short-lived; host refreshes on 401)
  if (token.startsWith('Bearer ')) {
    return { authHeader: token, actorHint: '' };
  }

  // PAT — Azure DevOps expects Basic auth with empty username: base64(":<pat>")
  const encoded = Buffer.from(`:${token}`).toString('base64');
  return {
    authHeader: `Basic ${encoded}`,
    actorHint: '',
  };
}
