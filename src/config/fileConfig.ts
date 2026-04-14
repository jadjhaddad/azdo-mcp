/**
 * Reads saved config from ~/.azdo-mcp/config.json (written by CLI/web setup).
 * Injects values into process.env so getEnv() picks them up.
 * Called once at server startup before anything else.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const CONFIG_DIR = path.join(os.homedir(), '.azdo-mcp');
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
export const TOKEN_CACHE_FILE = path.join(CONFIG_DIR, 'token-cache.json');

interface SavedConfig {
  orgUrl?: string;
  allowedProjects?: string[];
  enableDelete?: boolean;
  account?: string;
}

export function loadFileConfig(): void {
  if (!fs.existsSync(CONFIG_FILE)) return;

  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const cfg: SavedConfig = JSON.parse(raw);

    if (cfg.orgUrl && !process.env.AZDO_ORG_URL) {
      process.env.AZDO_ORG_URL = cfg.orgUrl;
    }
    if (cfg.allowedProjects?.length && !process.env.AZDO_ALLOWED_PROJECTS) {
      process.env.AZDO_ALLOWED_PROJECTS = cfg.allowedProjects.join(',');
    }
    if (cfg.enableDelete !== undefined && !process.env.ENABLE_DELETE) {
      process.env.ENABLE_DELETE = cfg.enableDelete ? 'true' : 'false';
    }
  } catch {
    // Corrupt config — ignore, server will prompt via setup tool
  }
}
