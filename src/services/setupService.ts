import { startDeviceCodeFlow, pollAuthComplete, DeviceCodeInfo } from '../auth/deviceCodeAuth.js';
import { _resetEnv } from '../config/env.js';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/** Apply org config to process.env and bust the cache */
export function applyConfig(opts: {
  orgUrl: string;
  allowedProjects?: string[];
  enableDelete: boolean;
}): void {
  const orgUrl = opts.orgUrl.replace(/\/$/, '');
  if (!orgUrl.startsWith('https://')) {
    throw new ValidationError('orgUrl must start with https://');
  }

  process.env.AZDO_ORG_URL = orgUrl;
  process.env.ENABLE_DELETE = opts.enableDelete ? 'true' : 'false';

  if (opts.allowedProjects?.length) {
    process.env.AZDO_ALLOWED_PROJECTS = opts.allowedProjects.join(',');
  } else {
    delete process.env.AZDO_ALLOWED_PROJECTS;
  }

  _resetEnv();
  logger.info({ orgUrl, enableDelete: opts.enableDelete }, 'Config applied');
}

/** Phase 1 — apply config + kick off device code flow, return code info immediately */
export async function startSetup(opts: {
  orgUrl: string;
  allowedProjects?: string[];
  enableDelete: boolean;
}): Promise<{ orgUrl: string; deviceCode: DeviceCodeInfo }> {
  applyConfig(opts);
  const deviceCode = await startDeviceCodeFlow();
  return { orgUrl: opts.orgUrl.replace(/\/$/, ''), deviceCode };
}

/** Phase 2 — check whether background auth resolved */
export function checkAuth(): { done: boolean; account?: string } {
  const result = pollAuthComplete();
  if (result.done) {
    return { done: true, account: result.account };
  }
  return { done: false };
}
