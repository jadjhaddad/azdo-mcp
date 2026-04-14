/**
 * Device code flow authentication via MSAL.
 *
 * When no static AZDO_TOKEN is configured, the server initiates a device code
 * flow. The user is told to visit https://microsoft.com/devicelogin and enter
 * a short code. Once they sign in with their Microsoft/work account the server
 * receives an access token automatically — no PAT required.
 *
 * Tokens are cached in memory with silent refresh. The user only needs to
 * sign in once per server process.
 */

import {
  PublicClientApplication,
  Configuration,
  AuthenticationResult,
  AccountInfo,
  SilentFlowRequest,
  DeviceCodeRequest,
} from '@azure/msal-node';
import { logger } from '../utils/logger.js';

// Azure DevOps resource — standard scope for user-delegated access
const AZDO_SCOPE = '499b84ac-1321-427f-aa17-267ca6975798/user_impersonation';

// Well-known public client ID (Azure Developer CLI) — works for device code
// flows against any work/school account without app registration.
const CLIENT_ID = '04b07795-8ddb-461a-bbee-02f9e1bf7b46';

const msalConfig: Configuration = {
  auth: {
    clientId: CLIENT_ID,
    authority: 'https://login.microsoftonline.com/organizations',
  },
};

let _pca: PublicClientApplication | undefined;
let _cachedAccount: AccountInfo | undefined;

function getPca(): PublicClientApplication {
  if (!_pca) {
    _pca = new PublicClientApplication(msalConfig);
  }
  return _pca;
}

/**
 * Acquire an access token via device code flow.
 * Prints the sign-in prompt to stderr — does not touch stdout (MCP transport).
 */
async function acquireViaDeviceCode(): Promise<AuthenticationResult> {
  const pca = getPca();

  const request: DeviceCodeRequest = {
    scopes: [AZDO_SCOPE],
    deviceCodeCallback: (response) => {
      // Output to stderr so MCP stdio transport is not polluted
      process.stderr.write('\n');
      process.stderr.write('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.stderr.write('  Azure DevOps sign-in required\n');
      process.stderr.write(`  ${response.message}\n`);
      process.stderr.write('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');
    },
  };

  const result = await pca.acquireTokenByDeviceCode(request);
  if (!result) throw new Error('Device code flow returned no token');

  _cachedAccount = result.account ?? undefined;
  logger.info({ account: result.account?.username }, 'Authenticated via device code');

  return result;
}

/**
 * Try to acquire a token silently (from cache / refresh token).
 * Falls back to device code flow on failure.
 */
export async function acquireToken(): Promise<string> {
  const pca = getPca();

  // Try silent acquisition first if we have a cached account
  if (_cachedAccount) {
    try {
      const silentRequest: SilentFlowRequest = {
        account: _cachedAccount,
        scopes: [AZDO_SCOPE],
      };
      const result = await pca.acquireTokenSilent(silentRequest);
      if (result?.accessToken) return result.accessToken;
    } catch {
      logger.debug('Silent token acquisition failed — re-authenticating');
    }
  }

  // Interactive device code flow
  const result = await acquireViaDeviceCode();
  return result.accessToken;
}

/** Reset cached state — test use only */
export function _resetMsalCache(): void {
  _pca = undefined;
  _cachedAccount = undefined;
}
