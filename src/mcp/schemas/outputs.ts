import { ToolEnvelope } from '../../types/toolContracts.js';

/**
 * Serialise a ToolEnvelope to the MCP content response format.
 * MCP tools must return { content: [{ type: 'text', text: string }] }
 */
export function toMcpContent(envelope: ToolEnvelope): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [{ type: 'text', text: JSON.stringify(envelope, null, 2) }],
  };
}

/**
 * Return an MCP error response (isError: true) for unexpected throws.
 * Prefer typed envelopes via toMcpContent for known errors.
 */
export function toMcpError(message: string): { isError: true; content: Array<{ type: 'text'; text: string }> } {
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
  };
}
