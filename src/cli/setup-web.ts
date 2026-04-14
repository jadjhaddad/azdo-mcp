#!/usr/bin/env node
/**
 * azdo-mcp web setup — starts a local server at http://localhost:3737
 * for first-time configuration and Microsoft sign-in.
 *
 *   node dist/cli-web.js
 *   npm run setup:web
 *
 * Opens the browser automatically. User fills in org URL, clicks Sign In,
 * follows the device code prompt, and setup saves to ~/.azdo-mcp/config.json.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { URL } from 'url';
import {
  PublicClientApplication,
  Configuration,
  DeviceCodeRequest,
} from '@azure/msal-node';

const PORT = 3737;
const AZDO_SCOPE = '499b84ac-1321-427f-aa17-267ca6975798/user_impersonation';
const CLIENT_ID = '04b07795-8ddb-461a-bbee-02f9e1bf7b46';
const CONFIG_DIR = path.join(os.homedir(), '.azdo-mcp');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const TOKEN_CACHE_FILE = path.join(CONFIG_DIR, 'token-cache.json');

// In-memory state for the current setup session
interface SetupState {
  phase: 'idle' | 'authenticating' | 'done' | 'error';
  deviceCode?: string;
  verificationUri?: string;
  message?: string;
  account?: string;
  error?: string;
  config?: object;
}

let state: SetupState = { phase: 'idle' };

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>azdo-mcp Setup</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0d1117; color: #e6edf3; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 2rem; width: 100%; max-width: 480px; }
    h1 { font-size: 1.4rem; font-weight: 600; margin-bottom: 0.25rem; }
    .sub { color: #8b949e; font-size: 0.9rem; margin-bottom: 1.5rem; }
    label { display: block; font-size: 0.85rem; color: #8b949e; margin-bottom: 0.3rem; }
    input[type=text], input[type=url] { width: 100%; padding: 0.6rem 0.8rem; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #e6edf3; font-size: 0.95rem; outline: none; transition: border-color 0.15s; }
    input:focus { border-color: #58a6ff; }
    .field { margin-bottom: 1rem; }
    .checkbox-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; }
    .checkbox-row input { width: auto; }
    .checkbox-row label { margin: 0; color: #e6edf3; }
    button { width: 100%; padding: 0.7rem; background: #238636; border: none; border-radius: 6px; color: #fff; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
    button:hover { background: #2ea043; }
    button:disabled { background: #21262d; color: #8b949e; cursor: not-allowed; }
    .code-box { background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 1.25rem; text-align: center; margin: 1rem 0; }
    .code { font-size: 2rem; font-weight: 700; letter-spacing: 0.15em; color: #58a6ff; font-family: monospace; }
    .code-url { color: #8b949e; font-size: 0.85rem; margin-top: 0.5rem; }
    .code-url a { color: #58a6ff; }
    .status { padding: 0.75rem; border-radius: 6px; margin-top: 1rem; font-size: 0.9rem; text-align: center; }
    .status.waiting { background: #1c2128; color: #8b949e; }
    .status.success { background: #0f2d1a; color: #3fb950; border: 1px solid #238636; }
    .status.error { background: #2d1a1a; color: #f85149; border: 1px solid #da3633; }
    .account { font-weight: 600; color: #3fb950; }
    .hidden { display: none; }
    .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #8b949e; border-top-color: #58a6ff; border-radius: 50%; animation: spin 0.8s linear infinite; vertical-align: middle; margin-right: 6px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
<div class="card">
  <h1>azdo-mcp Setup</h1>
  <p class="sub">Configure your Azure DevOps MCP server</p>

  <div id="form-section">
    <div class="field">
      <label for="orgUrl">Organisation URL</label>
      <input type="url" id="orgUrl" placeholder="https://dev.azure.com/your-org" />
    </div>
    <div class="field">
      <label for="projects">Allowed projects <span style="color:#8b949e">(comma-separated, blank = all)</span></label>
      <input type="text" id="projects" placeholder="ProjectA, ProjectB" />
    </div>
    <div class="checkbox-row">
      <input type="checkbox" id="enableDelete" />
      <label for="enableDelete">Enable delete_ticket (requires confirmation per deletion)</label>
    </div>
    <button id="startBtn" onclick="startSetup()">Sign in with Microsoft</button>
  </div>

  <div id="auth-section" class="hidden">
    <p style="color:#8b949e;font-size:0.9rem;margin-bottom:0.5rem">Open this link and enter the code below:</p>
    <div class="code-box">
      <div class="code" id="deviceCode">——</div>
      <div class="code-url">
        <a id="verifyLink" href="#" target="_blank">https://microsoft.com/devicelogin</a>
      </div>
    </div>
    <div class="status waiting" id="authStatus">
      <span class="spinner"></span> Waiting for sign-in...
    </div>
  </div>

  <div id="done-section" class="hidden">
    <div class="status success">
      ✓ Authenticated as <span class="account" id="accountName"></span>
    </div>
    <div style="margin-top:1rem;color:#8b949e;font-size:0.85rem;text-align:center">
      Config saved. Restart Claude / OpenCode to apply.<br/>
      <span style="color:#3fb950">You can close this window.</span>
    </div>
  </div>

  <div id="error-section" class="hidden">
    <div class="status error" id="errorMsg"></div>
  </div>
</div>

<script>
async function startSetup() {
  const orgUrl = document.getElementById('orgUrl').value.trim();
  if (!orgUrl) { alert('Please enter your org URL'); return; }

  const projects = document.getElementById('projects').value.trim();
  const enableDelete = document.getElementById('enableDelete').checked;

  document.getElementById('startBtn').disabled = true;
  document.getElementById('startBtn').textContent = 'Starting...';

  const res = await fetch('/api/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgUrl, projects, enableDelete })
  });
  const data = await res.json();

  if (!data.ok) {
    showError(data.error);
    return;
  }

  document.getElementById('form-section').classList.add('hidden');
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('deviceCode').textContent = data.userCode;
  const link = document.getElementById('verifyLink');
  link.href = data.verificationUri;
  link.textContent = data.verificationUri;

  pollAuth();
}

async function pollAuth() {
  const res = await fetch('/api/poll');
  const data = await res.json();

  if (data.phase === 'done') {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('done-section').classList.remove('hidden');
    document.getElementById('accountName').textContent = data.account;
    return;
  }

  if (data.phase === 'error') {
    showError(data.error);
    return;
  }

  setTimeout(pollAuth, 2000);
}

function showError(msg) {
  document.getElementById('form-section').classList.remove('hidden');
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('error-section').classList.remove('hidden');
  document.getElementById('errorMsg').textContent = msg;
  document.getElementById('startBtn').disabled = false;
  document.getElementById('startBtn').textContent = 'Sign in with Microsoft';
}
</script>
</body>
</html>`;

async function startAuth(opts: {
  orgUrl: string;
  projects: string;
  enableDelete: boolean;
}): Promise<{ userCode: string; verificationUri: string }> {
  state = { phase: 'authenticating' };

  let tokenCacheData = '';
  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    try { tokenCacheData = fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'); } catch { /* ignore */ }
  }

  const msalConfig: Configuration = {
    auth: { clientId: CLIENT_ID, authority: 'https://login.microsoftonline.com/organizations' },
    cache: {
      cachePlugin: {
        beforeCacheAccess: async (ctx) => { if (tokenCacheData) ctx.tokenCache.deserialize(tokenCacheData); },
        afterCacheAccess: async (ctx) => { if (ctx.cacheHasChanged) tokenCacheData = ctx.tokenCache.serialize(); },
      },
    },
  };

  const pca = new PublicClientApplication(msalConfig);

  return new Promise((resolve, reject) => {
    const request: DeviceCodeRequest = {
      scopes: [AZDO_SCOPE],
      deviceCodeCallback: (response) => {
        state.deviceCode = response.userCode;
        state.verificationUri = response.verificationUri;
        resolve({ userCode: response.userCode, verificationUri: response.verificationUri });
      },
    };

    pca.acquireTokenByDeviceCode(request)
      .then((result) => {
        if (!result) { state = { phase: 'error', error: 'No token returned' }; return; }

        // Save config
        const allowedProjects = opts.projects
          ? opts.projects.split(',').map((p) => p.trim()).filter(Boolean)
          : [];

        fs.mkdirSync(CONFIG_DIR, { recursive: true });
        const config = {
          orgUrl: opts.orgUrl.replace(/\/$/, ''),
          allowedProjects,
          enableDelete: opts.enableDelete,
          account: result.account?.username ?? 'unknown',
          configuredAt: new Date().toISOString(),
        };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        if (tokenCacheData) fs.writeFileSync(TOKEN_CACHE_FILE, tokenCacheData);

        state = { phase: 'done', account: result.account?.username ?? 'authenticated', config };
      })
      .catch((err: Error) => {
        state = { phase: 'error', error: err.message };
        reject(err);
      });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (url.pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
    return;
  }

  if (url.pathname === '/api/start' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const { orgUrl, projects, enableDelete } = JSON.parse(body);
        const { userCode, verificationUri } = await startAuth({ orgUrl, projects, enableDelete });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, userCode, verificationUri }));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(err) }));
      }
    });
    return;
  }

  if (url.pathname === '/api/poll' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ phase: state.phase, account: state.account, error: state.error }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  const setupUrl = `http://localhost:${PORT}`;
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  azdo-mcp Setup`);
  console.log(`  Open: ${setupUrl}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Try to open browser automatically
  const open = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const { exec } = require('child_process');
  exec(`${open} ${setupUrl}`, () => { /* ignore errors */ });
});
