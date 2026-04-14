/**
 * Auth adapter — resolves the Authorization header for AzDO API calls.
 *
 * Priority:
 *   1. AZDO_TOKEN env var (PAT or Bearer) — static, no user interaction
 *   2. Device code flow via MSAL — user signs in via browser once per session;
 *      subsequent calls use silent token refresh automatically.
 *
 * Tokens are NEVER returned in tool output or logged.
 */
import { getEnv } from '../config/env.js';
import { acquireToken } from './deviceCodeAuth.js';
import { logger } from '../utils/logger.js';

export interface AuthContext {
  /** Pre-built Authorization header value — never log this */
  authHeader: string;
  /** Display-safe identity hint (email/UPN) */
  actorHint: string;
}

/**
 * Resolve an AuthContext for the current request.
 * Async because device code flow (when triggered) must await user sign-in.
 */
export async function resolveAuth(): Promise<AuthContext> {
  const env = getEnv();
  const staticToken = env.AZDO_TOKEN;

  // ── Static token path (PAT or Bearer) ────────────────────────────────────
  if (staticToken) {
    if (staticToken.startsWith('Bearer ')) {
      return { authHeader: staticToken, actorHint: '' };
    }
    // PAT — AzDO Basic auth: base64(":<pat>")
    const encoded = Buffer.from(`:${staticToken}`).toString('base64');
    return { authHeader: `Basic ${encoded}`, actorHint: '' };
  }

  // ── Device code / MSAL path ───────────────────────────────────────────────
  logger.info('No AZDO_TOKEN set — initiating device code authentication');
  const accessToken = await acquireToken();
  return { authHeader: `Bearer ${accessToken}`, actorHint: '' };
}
