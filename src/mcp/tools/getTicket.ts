import { toMcpContent } from '../schemas/outputs.js';
import { fail } from '../../types/toolContracts.js';

// Phase 0 stub — replaced in Phase 1/2/3
export async function handleGetTicket(_args: unknown): Promise<ReturnType<typeof toMcpContent>> {
  return toMcpContent(fail('INTERNAL_ERROR', 'getTicket not yet implemented', undefined, false));
}
