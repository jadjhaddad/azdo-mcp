import { startDeviceCodeFlow, pollAuthComplete, DeviceCodeInfo } from '../auth/deviceCodeAuth.js';
import { _resetEnv } from '../config/env.js';
import { ValidationError, OrgUrlError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';

/** Ping the ADO org URL to verify it resolves before starting auth */
async function validateOrgUrl(orgUrl: string): Promise<void> {
  try {
    const res = await axios.get(`${orgUrl}/_apis/projects`, {
      params: { 'api-version': '7.1', $top: 1 },
      timeout: 8_000,
      validateStatus: (s) => s < 500, // 401/403 = URL is valid, just needs auth
    });
    if (res.status === 502 || res.status === 503) {
      throw new OrgUrlError(orgUrl);
    }
  } catch (err) {
    if (err instanceof OrgUrlError) throw err;
    // Network errors (ENOTFOUND, ECONNREFUSED) mean the URL doesn't exist
    if (axios.isAxiosError(err) && !err.response) {
      throw new OrgUrlError(orgUrl);
    }
    // Any other response (401, 403, 200) means the URL is valid
  }
}

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

/** Phase 1 — validate org URL, apply config, kick off device code flow */
export async function startSetup(opts: {
  orgUrl: string;
  allowedProjects?: string[];
  enableDelete: boolean;
}): Promise<{ orgUrl: string; deviceCode: DeviceCodeInfo }> {
  await validateOrgUrl(opts.orgUrl.replace(/\/$/, ''));
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
