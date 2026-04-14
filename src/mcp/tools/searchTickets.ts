import { toMcpContent } from '../schemas/outputs.js';
import { ok } from '../../types/toolContracts.js';
import { searchTickets } from '../../services/ticketService.js';
import { SearchTicketsInputType } from '../schemas/inputs.js';

export async function handleSearchTickets(
  args: SearchTicketsInputType,
): Promise<ReturnType<typeof toMcpContent>> {
  const result = await searchTickets({
    projects: args.projects,
    filter: {
      states: args.states,
      types: args.types,
      tags: args.tags,
      text: args.text,
      assignedTo: args.assignedTo,
      changedAfter: args.changedAfter,
      changedBefore: args.changedBefore,
    },
    top: args.top,
    skip: args.skip,
  });

  return toMcpContent(
    ok({
      count: result.items.length,
      items: result.items.map((wi) => ({
        id: wi.id,
        title: wi.fields['System.Title'],
        state: wi.fields['System.State'],
        type: wi.fields['System.WorkItemType'],
        assignedTo: (wi.fields['System.AssignedTo'] as { displayName?: string } | undefined)
          ?.displayName,
        changedDate: wi.fields['System.ChangedDate'],
        tags: wi.fields['System.Tags'],
        project: wi.fields['System.TeamProject'],
        url: wi.url,
      })),
      errors: result.errors.length ? result.errors : undefined,
    }),
  );
}
