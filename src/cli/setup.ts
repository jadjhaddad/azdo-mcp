#!/usr/bin/env node
/**
 * azdo-mcp setup — run this once in the terminal to configure and authenticate.
 *
 *   node dist/cli.js setup
 *   node dist/cli.js setup --org https://dev.azure.com/my-org --projects "A,B"
 *
 * Saves config to ~/.azdo-mcp/config.json which the MCP server reads at startup.
 * Stores the MSAL token cache alongside so sign-in persists across server restarts.
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  PublicClientApplication,
  Configuration,
  DeviceCodeRequest,
} from '@azure/msal-node';

const AZDO_SCOPE = '499b84ac-1321-427f-aa17-267ca6975798/user_impersonation';
const CLIENT_ID = '04b07795-8ddb-461a-bbee-02f9e1bf7b46';
const CONFIG_DIR = path.join(os.homedir(), '.azdo-mcp');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const TOKEN_CACHE_FILE = path.join(CONFIG_DIR, 'token-cache.json');

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--') && argv[i + 1]) {
      args[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

async function run(): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  azdo-mcp setup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const cliArgs = parseArgs();

  // ── Org URL ───────────────────────────────────────────────────────────────
  let orgUrl = cliArgs.org ?? '';
  if (!orgUrl) {
    orgUrl = await prompt('Azure DevOps org URL (e.g. https://dev.azure.com/my-org): ');
  }
  orgUrl = orgUrl.replace(/\/$/, '');
  if (!orgUrl.startsWith('https://')) {
    console.error('Error: org URL must start with https://');
    process.exit(1);
  }

  // ── Allowed projects ──────────────────────────────────────────────────────
  let projectsRaw = cliArgs.projects ?? '';
  if (!projectsRaw) {
    projectsRaw = await prompt('Allowed projects (comma-separated, leave blank for all): ');
  }
  const allowedProjects = projectsRaw
    ? projectsRaw.split(',').map((p) => p.trim()).filter(Boolean)
    : [];

  // ── Delete gate ───────────────────────────────────────────────────────────
  let enableDeleteRaw = cliArgs['enable-delete'] ?? '';
  if (!enableDeleteRaw) {
    enableDeleteRaw = await prompt('Enable delete_ticket tool? (y/N): ');
  }
  const enableDelete = ['y', 'yes', 'true'].includes(enableDeleteRaw.toLowerCase());

  // ── MSAL device code auth ─────────────────────────────────────────────────
  console.log('\nInitiating Azure DevOps sign-in...\n');

  // Load existing token cache if present
  let tokenCacheData = '';
  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    try {
      tokenCacheData = fs.readFileSync(TOKEN_CACHE_FILE, 'utf8');
    } catch { /* ignore */ }
  }

  const msalConfig: Configuration = {
    auth: {
      clientId: CLIENT_ID,
      authority: 'https://login.microsoftonline.com/organizations',
    },
    cache: {
      cachePlugin: {
        beforeCacheAccess: async (context) => {
          if (tokenCacheData) context.tokenCache.deserialize(tokenCacheData);
        },
        afterCacheAccess: async (context) => {
          if (context.cacheHasChanged) {
            tokenCacheData = context.tokenCache.serialize();
          }
        },
      },
    },
  };

  const pca = new PublicClientApplication(msalConfig);

  // Try silent first if we have cached accounts
  const accounts = await pca.getTokenCache().getAllAccounts();
  let accessToken = '';
  let account = '';

  if (accounts.length > 0) {
    try {
      const silent = await pca.acquireTokenSilent({
        account: accounts[0],
        scopes: [AZDO_SCOPE],
      });
      if (silent?.accessToken) {
        accessToken = silent.accessToken;
        account = accounts[0].username;
        console.log(`✓ Using cached credentials for ${account}`);
      }
    } catch { /* fall through to device code */ }
  }

  if (!accessToken) {
    const request: DeviceCodeRequest = {
      scopes: [AZDO_SCOPE],
      deviceCodeCallback: (response) => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(response.message);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('Waiting for sign-in...');
      },
    };

    const result = await pca.acquireTokenByDeviceCode(request);
    if (!result?.accessToken) {
      console.error('Authentication failed — no token returned');
      process.exit(1);
    }
    accessToken = result.accessToken;
    account = result.account?.username ?? 'unknown';
    console.log(`\n✓ Signed in as ${account}`);
  }

  // ── Save config ───────────────────────────────────────────────────────────
  fs.mkdirSync(CONFIG_DIR, { recursive: true });

  const config = {
    orgUrl,
    allowedProjects,
    enableDelete,
    account,
    configuredAt: new Date().toISOString(),
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  // Save token cache for persistent silent auth on next run
  if (tokenCacheData) {
    fs.writeFileSync(TOKEN_CACHE_FILE, tokenCacheData);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Setup complete!');
  console.log(`  Org:      ${orgUrl}`);
  console.log(`  Projects: ${allowedProjects.length ? allowedProjects.join(', ') : 'all'}`);
  console.log(`  Delete:   ${enableDelete ? 'enabled' : 'disabled'}`);
  console.log(`  Account:  ${account}`);
  console.log(`  Config:   ${CONFIG_FILE}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('The MCP server will use this config automatically.');
  console.log('Restart Claude / OpenCode to apply.\n');
}

run().catch((err) => {
  console.error('\nSetup failed:', err.message ?? err);
  process.exit(1);
});
