import { toMcpContent } from '../schemas/outputs.js';
import { ok } from '../../types/toolContracts.js';
import { listMyTickets } from '../../services/ticketService.js';
import { ListMyTicketsInputType } from '../schemas/inputs.js';

export async function handleListMyTickets(
  args: ListMyTicketsInputType,
): Promise<ReturnType<typeof toMcpContent>> {
  const result = await listMyTickets({
    projects: args.projects,
    states: args.states,
    types: args.types,
    assignedTo: args.assignedTo,
    top: args.top,
    skip: args.skip,
  });

  return toMcpContent(
    ok({
      count: result.items.length,
      items: result.items.map(flattenWorkItem),
      errors: result.errors.length ? result.errors : undefined,
    }),
  );
}

function flattenWorkItem(wi: import('../../types/azdo.js').AzdoWorkItem) {
  return {
    id: wi.id,
    title: wi.fields['System.Title'],
    state: wi.fields['System.State'],
    type: wi.fields['System.WorkItemType'],
    assignedTo: (wi.fields['System.AssignedTo'] as { displayName?: string } | undefined)
      ?.displayName,
    changedDate: wi.fields['System.ChangedDate'],
    project: wi.fields['System.TeamProject'],
    url: wi.url,
  };
}
