import { toMcpContent } from '../schemas/outputs.js';
import { ok } from '../../types/toolContracts.js';
import { executeDelete } from '../../services/deleteService.js';
import { DeleteTicketInputType } from '../schemas/inputs.js';

export async function handleDeleteTicket(
  args: DeleteTicketInputType,
): Promise<ReturnType<typeof toMcpContent>> {
  await executeDelete({
    id: args.id,
    confirm: args.confirm,
    hardDelete: args.hardDelete,
  });

  return toMcpContent(ok({ deleted: true, id: args.id }));
}
