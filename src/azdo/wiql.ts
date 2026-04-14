import { azdoPost } from './client.js';
import { AzdoWiqlResult } from '../types/azdo.js';

export interface WiqlOptions {
  project: string;
  wiql: string;
  top?: number;
}

export async function runWiql(opts: WiqlOptions): Promise<AzdoWiqlResult> {
  return azdoPost<AzdoWiqlResult>(
    `/${encodeURIComponent(opts.project)}/_apis/wit/wiql`,
    { query: opts.wiql },
    { $top: opts.top ?? 200 },
  );
}

// ─── Query builders ───────────────────────────────────────────────────────────

function wiqlString(value: string): string {
  // Escape single quotes in WIQL strings
  return `'${value.replace(/'/g, "''")}'`;
}

export interface ListMyTicketsFilter {
  assignedTo?: string;
  states?: string[];
  types?: string[];
  top?: number;
}

export function buildListMyTicketsWiql(project: string, filter: ListMyTicketsFilter): string {
  const conditions: string[] = [`[System.TeamProject] = ${wiqlString(project)}`];

  const assignee = filter.assignedTo ?? '@Me';
  // @Me is a WIQL macro — only quote if it's a real name
  conditions.push(
    assignee === '@Me'
      ? `[System.AssignedTo] = @Me`
      : `[System.AssignedTo] = ${wiqlString(assignee)}`,
  );

  if (filter.states?.length) {
    const list = filter.states.map(wiqlString).join(', ');
    conditions.push(`[System.State] IN (${list})`);
  }

  if (filter.types?.length) {
    const list = filter.types.map(wiqlString).join(', ');
    conditions.push(`[System.WorkItemType] IN (${list})`);
  }

  return (
    `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], ` +
    `[System.AssignedTo], [System.ChangedDate] ` +
    `FROM WorkItems ` +
    `WHERE ${conditions.join(' AND ')} ` +
    `ORDER BY [System.ChangedDate] DESC`
  );
}

export interface SearchFilter {
  states?: string[];
  types?: string[];
  tags?: string[];
  text?: string;
  assignedTo?: string;
  changedAfter?: string;
  changedBefore?: string;
}

export function buildSearchWiql(project: string, filter: SearchFilter): string {
  const conditions: string[] = [`[System.TeamProject] = ${wiqlString(project)}`];

  if (filter.states?.length) {
    const list = filter.states.map(wiqlString).join(', ');
    conditions.push(`[System.State] IN (${list})`);
  }

  if (filter.types?.length) {
    const list = filter.types.map(wiqlString).join(', ');
    conditions.push(`[System.WorkItemType] IN (${list})`);
  }

  if (filter.assignedTo) {
    conditions.push(`[System.AssignedTo] = ${wiqlString(filter.assignedTo)}`);
  }

  // Tag filtering: AzDO supports CONTAINS for tags
  for (const tag of filter.tags ?? []) {
    conditions.push(`[System.Tags] CONTAINS ${wiqlString(tag)}`);
  }

  if (filter.text) {
    conditions.push(`[System.Title] CONTAINS ${wiqlString(filter.text)}`);
  }

  if (filter.changedAfter) {
    conditions.push(`[System.ChangedDate] >= ${wiqlString(filter.changedAfter)}`);
  }

  if (filter.changedBefore) {
    conditions.push(`[System.ChangedDate] <= ${wiqlString(filter.changedBefore)}`);
  }

  return (
    `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], ` +
    `[System.AssignedTo], [System.ChangedDate], [System.Tags] ` +
    `FROM WorkItems ` +
    `WHERE ${conditions.join(' AND ')} ` +
    `ORDER BY [System.ChangedDate] DESC`
  );
}
