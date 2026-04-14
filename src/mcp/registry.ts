import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.js';
import { toMcpContent, toMcpError } from './schemas/outputs.js';
import { fail } from '../types/toolContracts.js';
import { AzdoMcpError } from '../utils/errors.js';

import {
  ListProjectsInput,
  ListMyTicketsInput,
  GetTicketInput,
  SearchTicketsInput,
  CreateTicketInput,
  UpdateTicketInput,
  TransitionTicketInput,
  AddTicketCommentInput,
  DeleteTicketInput,
} from './schemas/inputs.js';

// Tool handlers — imported lazily so each phase can fill them in
import { handleListProjects } from './tools/listProjects.js';
import { handleListMyTickets } from './tools/listMyTickets.js';
import { handleGetTicket } from './tools/getTicket.js';
import { handleSearchTickets } from './tools/searchTickets.js';
import { handleCreateTicket } from './tools/createTicket.js';
import { handleUpdateTicket } from './tools/updateTicket.js';
import { handleTransitionTicket } from './tools/transitionTicket.js';
import { handleAddTicketComment } from './tools/addTicketComment.js';
import { handleDeleteTicket } from './tools/deleteTicket.js';

/** Wrap any handler so unhandled throws become clean error envelopes */
function safe<T extends Record<string, unknown>>(
  name: string,
  handler: (args: T) => Promise<ReturnType<typeof toMcpContent>>,
): (args: T) => Promise<ReturnType<typeof toMcpContent>> {
  return async (args: T) => {
    try {
      return await handler(args);
    } catch (err) {
      if (err instanceof AzdoMcpError) {
        return toMcpContent(err.toEnvelope());
      }
      logger.error({ err, tool: name }, 'Unhandled tool error');
      return toMcpError(`Unexpected error in ${name}: ${String(err)}`);
    }
  };
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    'list_projects',
    {
      title: 'List Projects',
      description: 'List Azure DevOps projects accessible within the configured organisation scope.',
      inputSchema: ListProjectsInput,
    },
    safe('list_projects', handleListProjects),
  );

  server.registerTool(
    'list_my_tickets',
    {
      title: 'List My Tickets',
      description:
        'List work items assigned to the current user (or a specified assignee) across one or more projects.',
      inputSchema: ListMyTicketsInput,
    },
    safe('list_my_tickets', handleListMyTickets),
  );

  server.registerTool(
    'get_ticket',
    {
      title: 'Get Ticket',
      description: 'Fetch full details of a single work item by ID.',
      inputSchema: GetTicketInput,
    },
    safe('get_ticket', handleGetTicket),
  );

  server.registerTool(
    'search_tickets',
    {
      title: 'Search Tickets',
      description:
        'Search work items across projects using structured filters (state, type, tags, text, date windows).',
      inputSchema: SearchTicketsInput,
    },
    safe('search_tickets', handleSearchTickets),
  );

  server.registerTool(
    'create_ticket',
    {
      title: 'Create Ticket',
      description: 'Create a new work item in the specified project.',
      inputSchema: CreateTicketInput,
    },
    safe('create_ticket', handleCreateTicket),
  );

  server.registerTool(
    'update_ticket',
    {
      title: 'Update Ticket',
      description: 'Update fields on an existing work item. Only allowlisted fields are accepted.',
      inputSchema: UpdateTicketInput,
    },
    safe('update_ticket', handleUpdateTicket),
  );

  server.registerTool(
    'transition_ticket',
    {
      title: 'Transition Ticket',
      description: 'Move a work item to a new state, with optional reason.',
      inputSchema: TransitionTicketInput,
    },
    safe('transition_ticket', handleTransitionTicket),
  );

  server.registerTool(
    'add_ticket_comment',
    {
      title: 'Add Ticket Comment',
      description: 'Add a comment to an existing work item.',
      inputSchema: AddTicketCommentInput,
    },
    safe('add_ticket_comment', handleAddTicketComment),
  );

  server.registerTool(
    'delete_ticket',
    {
      title: 'Delete Ticket',
      description:
        'Delete a work item. Requires ENABLE_DELETE=true and a confirmation token matching "DELETE-<id>".',
      inputSchema: DeleteTicketInput,
    },
    safe('delete_ticket', handleDeleteTicket),
  );

  logger.info('All 9 tools registered');
}
