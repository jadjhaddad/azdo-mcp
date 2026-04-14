import { toMcpContent } from '../schemas/outputs.js';
import { ok } from '../../types/toolContracts.js';
import { updateWorkItem } from '../../azdo/workItems.js';
import { JsonPatchOperation } from '../../types/azdo.js';
import { isWritableField } from '../../config/policy.js';
import { ValidationError } from '../../utils/errors.js';
import { UpdateTicketInputType } from '../schemas/inputs.js';
import { auditLog } from '../../utils/logger.js';

export async function handleUpdateTicket(
  args: UpdateTicketInputType,
): Promise<ReturnType<typeof toMcpContent>> {
  const entries = Object.entries(args.fields);
  if (entries.length === 0) {
    throw new ValidationError('fields map is empty — nothing to update');
  }

  // Enforce writable-field allowlist
  const forbidden = entries.filter(([key]) => !isWritableField(key)).map(([key]) => key);
  if (forbidden.length > 0) {
    throw new ValidationError(
      `Field(s) not in write allowlist: ${forbidden.join(', ')}`,
      { forbidden },
    );
  }

  const ops: JsonPatchOperation[] = entries.map(([key, value]) => ({
    op: 'add',
    path: `/fields/${key}`,
    value,
  }));

  const wi = await updateWorkItem(args.id, ops);

  auditLog({ actor: 'mcp', action: 'update_ticket', targetId: args.id, status: 'success' });

  return toMcpContent(
    ok({
      id: wi.id,
      rev: wi.rev,
      url: wi.url,
      updatedFields: Object.keys(args.fields),
    }),
  );
}
