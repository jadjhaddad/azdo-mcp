#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadFileConfig } from './config/fileConfig.js';
import { getEnv } from './config/env.js';
import { logger } from './utils/logger.js';
import { registerTools } from './mcp/registry.js';

async function main(): Promise<void> {
  // Load saved config from ~/.azdo-mcp/config.json (written by CLI/web setup)
  loadFileConfig();

  const env = getEnv();

  const server = new McpServer({
    name: env.SERVER_NAME,
    version: env.SERVER_VERSION,
  });

  registerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info({ name: env.SERVER_NAME, version: env.SERVER_VERSION }, 'azdo-mcp server running');

  if (!env.AZDO_ORG_URL) {
    logger.warn('AZDO_ORG_URL not set — set it in the MCP server env config before calling any tools');
  }
}

main().catch((err) => {
  process.stderr.write(`[azdo-mcp] Fatal: ${String(err)}\n`);
  process.exit(1);
});
