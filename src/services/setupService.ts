/**
 * Setup service — called by the `setup` MCP tool.
 *
 * Accepts orgUrl + optional project list from the LLM/user, injects them into
 * the running process environment, then triggers the MSAL device code flow so
 * the user authenticates immediately.  After this call succeeds every other
 * tool is ready to use.
 */

import { acquireToken } from '../auth/deviceCodeAuth.js';
import { _resetEnv } from '../config/env.js';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface SetupResult {
  orgUrl: string;
  allowedProjects: string[];
  enableDelete: boolean;
  authenticated: boolean;
  account: string;
}

export async function runSetup(opts: {
  orgUrl: string;
  allowedProjects?: string[];
  enableDelete: boolean;
}): Promise<SetupResult> {
  const orgUrl = opts.orgUrl.replace(/\/$/, '');

  // Basic sanity check before touching env
  if (!orgUrl.startsWith('https://')) {
    throw new ValidationError('orgUrl must start with https://');
  }

  // Inject into process.env so getEnv() picks them up on next call
  process.env.AZDO_ORG_URL = orgUrl;

  if (opts.allowedProjects?.length) {
    process.env.AZDO_ALLOWED_PROJECTS = opts.allowedProjects.join(',');
  } else {
    delete process.env.AZDO_ALLOWED_PROJECTS;
  }

  process.env.ENABLE_DELETE = opts.enableDelete ? 'true' : 'false';

  // Bust the env cache so next getEnv() reads fresh values
  _resetEnv();

  logger.info({ orgUrl, enableDelete: opts.enableDelete }, 'Setup: configuration applied');

  // Trigger device code authentication now
  // The user will see a sign-in prompt in their MCP client's stderr/log panel
  let account = 'unknown';
  let authenticated = false;

  try {
    await acquireToken();
    authenticated = true;
    // Account hint is stored inside MSAL cache; we surface a generic message
    account = process.env.AZDO_AUTHENTICATED_ACCOUNT ?? 'authenticated';
    logger.info('Setup: authentication successful');
  } catch (err) {
    logger.error({ err }, 'Setup: authentication failed');
    throw err;
  }

  return {
    orgUrl,
    allowedProjects: opts.allowedProjects ?? [],
    enableDelete: opts.enableDelete,
    authenticated,
    account,
  };
}
