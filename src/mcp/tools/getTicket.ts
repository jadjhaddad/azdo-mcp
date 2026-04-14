import { toMcpContent } from '../schemas/outputs.js';
import { ok } from '../../types/toolContracts.js';
import { fetchTicket } from '../../services/ticketService.js';
import { GetTicketInputType } from '../schemas/inputs.js';

export async function handleGetTicket(
  args: GetTicketInputType,
): Promise<ReturnType<typeof toMcpContent>> {
  const wi = await fetchTicket(args.id, args.expand);

  return toMcpContent(ok({ id: wi.id, rev: wi.rev, fields: wi.fields, url: wi.url }));
}
