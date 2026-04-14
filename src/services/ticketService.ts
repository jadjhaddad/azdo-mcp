import { runWiql, buildListMyTicketsWiql, buildSearchWiql, SearchFilter } from '../azdo/wiql.js';
import { getWorkItemsBatch, getWorkItem } from '../azdo/workItems.js';
import { AzdoWorkItem } from '../types/azdo.js';
import { isProjectAllowed } from '../config/policy.js';
import { getAllowedProjects } from '../config/policy.js';
import { getEnv } from '../config/env.js';
import { ForbiddenError, ValidationError } from '../utils/errors.js';
import { clampPageSize } from '../utils/paging.js';
import { logger } from '../utils/logger.js';

/** Resolve which projects to query; throws if any are outside policy */
export function resolveProjects(requested?: string[]): string[] {
  const allowed = getAllowedProjects();
  const defaultProject = getEnv().AZDO_DEFAULT_PROJECT;

  let projects = requested?.length ? requested : allowed.length ? allowed : [];

  if (!projects.length) {
    if (defaultProject) {
      projects = [defaultProject];
    } else {
      throw new ValidationError(
        'No projects specified and no default configured. Pass projects[] or set AZDO_DEFAULT_PROJECT.',
      );
    }
  }

  for (const p of projects) {
    if (!isProjectAllowed(p)) {
      throw new ForbiddenError(`Project "${p}" is not in the configured allowlist`);
    }
  }

  return projects;
}

export interface FanOutResult {
  items: AzdoWorkItem[];
  errors: Array<{ project: string; error: string }>;
}

/**
 * Run a WIQL query across multiple projects in parallel.
 * Returns merged results sorted by ChangedDate desc.
 * Per-project failures are collected rather than aborting.
 */
export async function fanOutWiql(
  projects: string[],
  buildWiql: (project: string) => string,
  top: number,
  skip: number,
): Promise<FanOutResult> {
  const clamped = clampPageSize(top);

  const settled = await Promise.allSettled(
    projects.map(async (project) => {
      const wiqlResult = await runWiql({
        project,
        wiql: buildWiql(project),
        top: clamped + skip, // fetch extra to allow skip after merge
      });
      return { project, ids: wiqlResult.workItems.map((w) => w.id) };
    }),
  );

  const allIds: number[] = [];
  const errors: FanOutResult['errors'] = [];

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      allIds.push(...result.value.ids);
    } else {
      const err = result.reason as { message?: string; project?: string };
      logger.warn({ err: err.message }, 'Fan-out project query failed');
      errors.push({
        project: err.project ?? 'unknown',
        error: err.message ?? String(err),
      });
    }
  }

  if (allIds.length === 0) return { items: [], errors };

  // Fetch full items for merged IDs
  const items = await getWorkItemsBatch(allIds);

  // Sort by ChangedDate descending, then apply skip/top
  items.sort((a, b) => {
    const aDate = String(a.fields['System.ChangedDate'] ?? '');
    const bDate = String(b.fields['System.ChangedDate'] ?? '');
    return bDate.localeCompare(aDate);
  });

  return { items: items.slice(skip, skip + clamped), errors };
}

export async function listMyTickets(opts: {
  projects?: string[];
  states?: string[];
  types?: string[];
  assignedTo?: string;
  top: number;
  skip: number;
}): Promise<FanOutResult> {
  const projects = resolveProjects(opts.projects);
  return fanOutWiql(
    projects,
    (p) => buildListMyTicketsWiql(p, { assignedTo: opts.assignedTo, states: opts.states, types: opts.types }),
    opts.top,
    opts.skip,
  );
}

export async function searchTickets(opts: {
  projects?: string[];
  filter: SearchFilter;
  top: number;
  skip: number;
}): Promise<FanOutResult> {
  const projects = resolveProjects(opts.projects);
  return fanOutWiql(
    projects,
    (p) => buildSearchWiql(p, opts.filter),
    opts.top,
    opts.skip,
  );
}

export async function fetchTicket(id: number, expand: string): Promise<AzdoWorkItem> {
  return getWorkItem(id, expand);
}
