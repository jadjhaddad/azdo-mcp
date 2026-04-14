/**
 * Device code flow authentication via MSAL.
 *
 * Two-phase non-blocking design (required for MCP stdio transport):
 *
 *   Phase 1 — startDeviceCodeFlow()
 *     Kicks off MSAL device code request in the background.
 *     Returns { userCode, verificationUri, expiresAt } immediately so the
 *     MCP tool can relay them to the user without blocking.
 *
 *   Phase 2 — pollAuthComplete()
 *     Checks whether the background flow has resolved.
 *     Returns { done: true, accessToken } on success, or { done: false } while
 *     still waiting.  Call repeatedly (e.g. every few seconds) until done.
 *
 * Silent refresh: once authenticated, acquireToken() uses the cached account
 * and only triggers the device code flow again when the refresh token expires.
 */

import * as fs from 'fs';
import {
  PublicClientApplication,
  Configuration,
  AuthenticationResult,
  AccountInfo,
  SilentFlowRequest,
  DeviceCodeRequest,
} from '@azure/msal-node';
import { logger } from '../utils/logger.js';
import { TOKEN_CACHE_FILE, CONFIG_DIR } from '../config/fileConfig.js';

const AZDO_SCOPE = '499b84ac-1321-427f-aa17-267ca6975798/user_impersonation';
// Well-known public client (Azure Developer CLI) — no app registration needed
const CLIENT_ID = '04b07795-8ddb-461a-bbee-02f9e1bf7b46';

let _tokenCacheData = '';

// Load persisted token cache from disk (written by CLI/web setup)
function loadCacheFromDisk(): void {
  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    try { _tokenCacheData = fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'); } catch { /* ignore */ }
  }
}

function saveCacheToDisk(): void {
  if (!_tokenCacheData) return;
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(TOKEN_CACHE_FILE, _tokenCacheData);
  } catch { /* ignore */ }
}

const msalConfig: Configuration = {
  auth: {
    clientId: CLIENT_ID,
    authority: 'https://login.microsoftonline.com/organizations',
  },
  cache: {
    cachePlugin: {
      beforeCacheAccess: async (ctx) => {
        loadCacheFromDisk();
        if (_tokenCacheData) ctx.tokenCache.deserialize(_tokenCacheData);
      },
      afterCacheAccess: async (ctx) => {
        if (ctx.cacheHasChanged) {
          _tokenCacheData = ctx.tokenCache.serialize();
          saveCacheToDisk();
        }
      },
    },
  },
};

let _pca: PublicClientApplication | undefined;
let _cachedAccount: AccountInfo | undefined;

// Background auth state
let _pendingAuthPromise: Promise<AuthenticationResult> | undefined;
let _pendingAuthResult: AuthenticationResult | undefined;
let _pendingAuthError: Error | undefined;

function getPca(): PublicClientApplication {
  if (!_pca) _pca = new PublicClientApplication(msalConfig);
  return _pca;
}

export interface DeviceCodeInfo {
  userCode: string;
  verificationUri: string;
  message: string;
  expiresAt: string; // ISO timestamp
}

/**
 * Phase 1 — start device code flow in the background.
 * Returns sign-in instructions immediately; does NOT block.
 */
export async function startDeviceCodeFlow(): Promise<DeviceCodeInfo> {
  // Reset any previous pending flow
  _pendingAuthResult = undefined;
  _pendingAuthError = undefined;

  return new Promise<DeviceCodeInfo>((resolveInfo, rejectInfo) => {
    let infoResolved = false;

    const request: DeviceCodeRequest = {
      scopes: [AZDO_SCOPE],
      deviceCodeCallback: (response) => {
        // Called synchronously by MSAL before it starts polling
        const info: DeviceCodeInfo = {
          userCode: response.userCode,
          verificationUri: response.verificationUri,
          message: response.message,
          expiresAt: new Date(Date.now() + response.expiresIn * 1000).toISOString(),
        };
        infoResolved = true;
        resolveInfo(info);
      },
    };

    // Run the full device code flow in the background
    _pendingAuthPromise = getPca().acquireTokenByDeviceCode(request) as Promise<AuthenticationResult>;

    _pendingAuthPromise
      .then((result) => {
        _pendingAuthResult = result;
        _cachedAccount = result.account ?? undefined;
        logger.info({ account: result.account?.username }, 'Device code auth complete');
      })
      .catch((err: Error) => {
        _pendingAuthError = err;
        logger.error({ err: err.message }, 'Device code auth failed');
        if (!infoResolved) rejectInfo(err);
      });
  });
}

export type PollResult =
  | { done: false }
  | { done: true; accessToken: string; account: string };

/**
 * Phase 2 — check whether the background device code flow has resolved.
 * Non-blocking — returns immediately.
 */
export function pollAuthComplete(): PollResult {
  if (_pendingAuthError) {
    throw _pendingAuthError;
  }
  if (_pendingAuthResult) {
    return {
      done: true,
      accessToken: _pendingAuthResult.accessToken,
      account: _pendingAuthResult.account?.username ?? 'authenticated',
    };
  }
  return { done: false };
}

/**
 * Acquire a token for API calls.
 * Priority:
 *   1. Silent refresh from in-memory cached account
 *   2. Silent refresh from disk token cache (written by CLI/web setup)
 *   3. Completed device code result in memory
 *   4. Throw — caller must trigger setup
 */
export async function acquireToken(): Promise<string> {
  const pca = getPca();

  // 1. Silent from in-memory account
  if (_cachedAccount) {
    try {
      const result = await pca.acquireTokenSilent({ account: _cachedAccount, scopes: [AZDO_SCOPE] });
      if (result?.accessToken) return result.accessToken;
    } catch {
      logger.debug('Silent token acquisition (memory) failed');
    }
  }

  // 2. Silent from disk cache
  const accounts = await pca.getTokenCache().getAllAccounts();
  if (accounts.length > 0) {
    try {
      const result = await pca.acquireTokenSilent({ account: accounts[0], scopes: [AZDO_SCOPE] });
      if (result?.accessToken) {
        _cachedAccount = accounts[0];
        logger.info({ account: accounts[0].username }, 'Authenticated silently from disk cache');
        return result.accessToken;
      }
    } catch {
      logger.debug('Silent token acquisition (disk) failed');
    }
  }

  // 3. Completed device code flow in memory
  if (_pendingAuthResult) {
    return _pendingAuthResult.accessToken;
  }

  throw new Error('Not authenticated. Run "npm run setup" or call the setup tool to sign in.');
}

/** Reset cached state — test use only */
export function _resetMsalCache(): void {
  _pca = undefined;
  _cachedAccount = undefined;
  _pendingAuthPromise = undefined;
  _pendingAuthResult = undefined;
  _pendingAuthError = undefined;
}
