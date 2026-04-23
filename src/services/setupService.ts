import { startDeviceCodeFlow, pollAuthComplete, DeviceCodeInfo } from '../auth/deviceCodeAuth.js';
import { _resetEnv } from '../config/env.js';
import { CONFIG_DIR, CONFIG_FILE } from '../config/fileConfig.js';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import * as fs from 'fs';

/** Persist org config to ~/.azdo-mcp/config.json so it survives server restarts */
function saveConfig(opts: { orgUrl: string; allowedProjects?: string[]; enableDelete: boolean }): void {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({
      orgUrl: opts.orgUrl,
      allowedProjects: opts.allowedProjects ?? [],
      enableDelete: opts.enableDelete,
    }, null, 2));
  } catch (err) {
    logger.warn({ err }, 'Failed to write config.json — org URL will not persist across restarts');
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
  saveConfig({ ...opts, orgUrl });
  logger.info({ orgUrl, enableDelete: opts.enableDelete }, 'Config applied');
}

/** Phase 1 — apply config and kick off device code flow */
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
