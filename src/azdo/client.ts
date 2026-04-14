import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import { resolveAuth } from '../auth/contextAuth.js';
import { getEnv } from '../config/env.js';
import { mapAxiosError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const API_VERSION = '7.2-preview';

async function buildClient(): Promise<AxiosInstance> {
  const { authHeader } = await resolveAuth();
  const { AZDO_ORG_URL } = getEnv();

  if (!AZDO_ORG_URL) {
    throw new Error(
      'AZDO_ORG_URL is not configured. Add it to the MCP server environment:\n' +
      '  AZDO_ORG_URL=https://dev.azure.com/your-org',
    );
  }

  const client = axios.create({
    baseURL: AZDO_ORG_URL,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 30_000,
  });

  axiosRetry(client, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (err) => {
      const status = err.response?.status;
      // Retry on network errors, 429, and 5xx (but not 401/403/4xx)
      return axiosRetry.isNetworkError(err) || status === 429 || (!!status && status >= 500);
    },
    onRetry: (count, err) => {
      logger.warn({ attempt: count, status: err.response?.status }, 'Retrying AzDO request');
    },
  });

  // Redact auth header from logged requests
  client.interceptors.request.use((config) => {
    logger.debug({ method: config.method?.toUpperCase(), url: config.url }, 'AzDO request');
    return config;
  });

  return client;
}

/** Returns a fresh client per call so token changes (and MSAL refresh) take effect immediately */
async function getClient(): Promise<AxiosInstance> {
  return buildClient();
}

export async function azdoGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  try {
    const res = await (await getClient()).get<T>(path, {
      params: { 'api-version': API_VERSION, ...params },
    });
    return res.data;
  } catch (err) {
    throw mapAxiosError(err);
  }
}

export async function azdoPost<T>(
  path: string,
  body: unknown,
  params?: Record<string, unknown>,
): Promise<T> {
  try {
    const res = await (await getClient()).post<T>(path, body, {
      params: { 'api-version': API_VERSION, ...params },
    });
    return res.data;
  } catch (err) {
    throw mapAxiosError(err);
  }
}

export async function azdoPatch<T>(
  path: string,
  body: unknown,
  params?: Record<string, unknown>,
  config?: AxiosRequestConfig,
): Promise<T> {
  try {
    const res = await (await getClient()).patch<T>(path, body, {
      params: { 'api-version': API_VERSION, ...params },
      ...config,
    });
    return res.data;
  } catch (err) {
    throw mapAxiosError(err);
  }
}

export async function azdoDelete(path: string, params?: Record<string, unknown>): Promise<void> {
  try {
    await (await getClient()).delete(path, {
      params: { 'api-version': API_VERSION, ...params },
    });
  } catch (err) {
    throw mapAxiosError(err);
  }
}
