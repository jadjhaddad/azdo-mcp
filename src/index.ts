#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getEnv } from './config/env.js';
import { logger } from './utils/logger.js';
import { registerTools } from './mcp/registry.js';

async function main(): Promise<void> {
  let env;
  try {
    env = getEnv();
  } catch (err) {
    // Config errors are fatal — write to stderr and exit
    process.stderr.write(`[azdo-mcp] ${String(err)}\n`);
    process.exit(1);
  }

  const server = new McpServer({
    name: env.SERVER_NAME,
    version: env.SERVER_VERSION,
  });

  registerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info({ name: env.SERVER_NAME, version: env.SERVER_VERSION }, 'azdo-mcp server running');
}

main().catch((err) => {
  process.stderr.write(`[azdo-mcp] Fatal: ${String(err)}\n`);
  process.exit(1);
});
