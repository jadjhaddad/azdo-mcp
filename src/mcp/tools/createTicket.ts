import { toMcpContent } from '../schemas/outputs.js';
import { ok } from '../../types/toolContracts.js';
import { createWorkItem } from '../../azdo/workItems.js';
import { FIELD, JsonPatchOperation } from '../../types/azdo.js';
import { isProjectAllowed } from '../../config/policy.js';
import { ForbiddenError } from '../../utils/errors.js';
import { CreateTicketInputType } from '../schemas/inputs.js';
import { auditLog } from '../../utils/logger.js';

export async function handleCreateTicket(
  args: CreateTicketInputType,
): Promise<ReturnType<typeof toMcpContent>> {
  if (!isProjectAllowed(args.project)) {
    throw new ForbiddenError(`Project "${args.project}" is not in the configured allowlist`);
  }

  const ops: JsonPatchOperation[] = [
    { op: 'add', path: FIELD.Title, value: args.title },
  ];

  if (args.description) ops.push({ op: 'add', path: FIELD.Description, value: args.description });
  if (args.assignedTo) ops.push({ op: 'add', path: FIELD.AssignedTo, value: args.assignedTo });
  if (args.areaPath) ops.push({ op: 'add', path: FIELD.AreaPath, value: args.areaPath });
  if (args.iterationPath) ops.push({ op: 'add', path: FIELD.IterationPath, value: args.iterationPath });
  if (args.priority) ops.push({ op: 'add', path: FIELD.Priority, value: args.priority });
  if (args.tags) ops.push({ op: 'add', path: FIELD.Tags, value: args.tags });

  const wi = await createWorkItem(args.project, args.type, ops);

  auditLog({ actor: 'mcp', action: 'create_ticket', targetId: wi.id, project: args.project, status: 'success' });

  return toMcpContent(
    ok({
      id: wi.id,
      url: wi.url,
      title: wi.fields['System.Title'],
      type: wi.fields['System.WorkItemType'],
      state: wi.fields['System.State'],
      project: args.project,
    }),
  );
}
