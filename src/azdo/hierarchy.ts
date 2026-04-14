import { getWorkItem, getWorkItemsBatch } from './workItems.js';
import { AzdoWorkItem } from '../types/azdo.js';

/** AzDO relation types for parent/child hierarchy */
const CHILD_REL = 'System.LinkTypes.Hierarchy-Forward';
const PARENT_REL = 'System.LinkTypes.Hierarchy-Reverse';

export interface WorkItemNode {
  id: number;
  title: string;
  type: string;
  state: string;
  assignedTo?: string;
  url: string;
  children: WorkItemNode[];
}

/** Extract child IDs from a work item's relations array */
export function extractChildIds(wi: AzdoWorkItem): number[] {
  const relations = wi._links ? [] : (wi as unknown as { relations?: Array<{ rel: string; url: string }> }).relations ?? [];
  return relations
    .filter((r) => r.rel === CHILD_REL)
    .map((r) => {
      const parts = r.url.split('/');
      return parseInt(parts[parts.length - 1], 10);
    })
    .filter((id) => !isNaN(id));
}

/** Extract parent ID from a work item's relations array, or null */
export function extractParentId(wi: AzdoWorkItem): number | null {
  const relations = (wi as unknown as { relations?: Array<{ rel: string; url: string }> }).relations ?? [];
  const parentRel = relations.find((r) => r.rel === PARENT_REL);
  if (!parentRel) return null;
  const parts = parentRel.url.split('/');
  const id = parseInt(parts[parts.length - 1], 10);
  return isNaN(id) ? null : id;
}

function toNode(wi: AzdoWorkItem, children: WorkItemNode[] = []): WorkItemNode {
  return {
    id: wi.id,
    title: String(wi.fields['System.Title'] ?? ''),
    type: String(wi.fields['System.WorkItemType'] ?? ''),
    state: String(wi.fields['System.State'] ?? ''),
    assignedTo: (wi.fields['System.AssignedTo'] as { displayName?: string } | undefined)
      ?.displayName,
    url: wi.url,
    children,
  };
}

/**
 * Build a full hierarchy tree rooted at `rootId`.
 * Fetches up to `maxDepth` levels deep (default 4: Epic→Feature→Story→Task).
 * Uses batch fetching to minimise round-trips.
 */
export async function getHierarchyTree(rootId: number, maxDepth = 4): Promise<WorkItemNode> {
  const root = await getWorkItem(rootId, 'relations');
  return buildTree(root, maxDepth, 0);
}

async function buildTree(wi: AzdoWorkItem, maxDepth: number, depth: number): Promise<WorkItemNode> {
  if (depth >= maxDepth) return toNode(wi);

  const childIds = extractChildIds(wi);
  if (childIds.length === 0) return toNode(wi);

  const childItems = await getWorkItemsBatch(childIds);

  // Fetch relations for children so we can recurse
  const childItemsWithRelations = await Promise.all(
    childItems.map((c) => getWorkItem(c.id, 'relations')),
  );

  const childNodes = await Promise.all(
    childItemsWithRelations.map((c) => buildTree(c, maxDepth, depth + 1)),
  );

  return toNode(wi, childNodes);
}
