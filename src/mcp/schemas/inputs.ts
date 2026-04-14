import { z } from 'zod';

// ─── Shared ──────────────────────────────────────────────────────────────────

const projectsArray = z
  .array(z.string().min(1))
  .optional()
  .describe('Project names to scope the operation; defaults to configured allowlist');

const paginationFields = {
  top: z.number().int().positive().max(200).optional().default(50).describe('Max results to return'),
  skip: z.number().int().min(0).optional().default(0).describe('Results to skip (offset)'),
};

// ─── Read tools ──────────────────────────────────────────────────────────────

export const ListProjectsInput = z.object({
  orgScope: z.string().optional().describe('Limit to projects within a specific org (optional)'),
});

export const ListMyTicketsInput = z.object({
  projects: projectsArray,
  states: z.array(z.string()).optional().describe('Filter by work item states, e.g. ["Active","In Progress"]'),
  types: z.array(z.string()).optional().describe('Filter by work item types, e.g. ["Bug","Task"]'),
  assignedTo: z.string().optional().describe('Filter by assignee UPN/display name; defaults to current user'),
  ...paginationFields,
});

export const GetTicketInput = z.object({
  id: z.number().int().positive().describe('Work item ID'),
  expand: z
    .enum(['all', 'fields', 'links', 'none', 'relations', 'workItemComments'])
    .optional()
    .default('fields')
    .describe('AzDO $expand parameter'),
});

export const SearchTicketsInput = z.object({
  projects: projectsArray,
  states: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional().describe('Work item tags to filter by (AND logic)'),
  text: z.string().optional().describe('Full-text search within title/description'),
  assignedTo: z.string().optional(),
  changedAfter: z.string().datetime({ offset: true }).optional().describe('ISO 8601 date-time'),
  changedBefore: z.string().datetime({ offset: true }).optional().describe('ISO 8601 date-time'),
  ...paginationFields,
});

// ─── Write tools ─────────────────────────────────────────────────────────────

export const CreateTicketInput = z.object({
  project: z.string().min(1).describe('Target project name'),
  type: z.string().min(1).describe('Work item type, e.g. "Bug", "Task", "User Story"'),
  title: z.string().min(1).max(255).describe('Work item title'),
  description: z.string().optional(),
  assignedTo: z.string().optional().describe('Assignee UPN or display name'),
  areaPath: z.string().optional(),
  iterationPath: z.string().optional(),
  priority: z.number().int().min(1).max(4).optional(),
  tags: z.string().optional().describe('Semi-colon separated tags'),
});

export const UpdateTicketInput = z.object({
  id: z.number().int().positive(),
  fields: z
    .record(z.string(), z.unknown())
    .describe('Map of field reference names to new values. Only allowlisted fields accepted.'),
});

export const TransitionTicketInput = z.object({
  id: z.number().int().positive(),
  toState: z.string().min(1).describe('Target state name, e.g. "Active", "Resolved", "Closed"'),
  reason: z.string().optional().describe('Transition reason (when applicable)'),
});

export const AddTicketCommentInput = z.object({
  id: z.number().int().positive(),
  commentText: z.string().min(1).describe('Comment text (supports HTML)'),
});

export const DeleteTicketInput = z.object({
  id: z.number().int().positive(),
  confirm: z
    .string()
    .optional()
    .describe('Must equal "DELETE-<id>" to proceed'),
  hardDelete: z
    .boolean()
    .optional()
    .default(false)
    .describe('Permanently destroy — always false unless explicitly enabled in policy'),
});

// ─── Inferred input types ─────────────────────────────────────────────────────

export type ListProjectsInputType = z.infer<typeof ListProjectsInput>;
export type ListMyTicketsInputType = z.infer<typeof ListMyTicketsInput>;
export type GetTicketInputType = z.infer<typeof GetTicketInput>;
export type SearchTicketsInputType = z.infer<typeof SearchTicketsInput>;
export type CreateTicketInputType = z.infer<typeof CreateTicketInput>;
export type UpdateTicketInputType = z.infer<typeof UpdateTicketInput>;
export type TransitionTicketInputType = z.infer<typeof TransitionTicketInput>;
export type AddTicketCommentInputType = z.infer<typeof AddTicketCommentInput>;
export type DeleteTicketInputType = z.infer<typeof DeleteTicketInput>;
