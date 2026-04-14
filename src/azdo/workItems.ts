import { azdoGet, azdoPatch, azdoPost, azdoDelete } from './client.js';
import { AzdoWorkItem, AzdoPagedResponse, JsonPatchOperation } from '../types/azdo.js';

/** Fetch a single work item by ID */
export async function getWorkItem(id: number, expand = 'fields'): Promise<AzdoWorkItem> {
  return azdoGet<AzdoWorkItem>(`/_apis/wit/workitems/${id}`, { $expand: expand });
}

/**
 * Fetch multiple work items by ID in a single batch call.
 * AzDO allows up to 200 IDs per request.
 */
export async function getWorkItemsBatch(
  ids: number[],
  fields?: string[],
): Promise<AzdoWorkItem[]> {
  if (ids.length === 0) return [];

  // Batch in chunks of 200
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += 200) {
    chunks.push(ids.slice(i, i + 200));
  }

  const results: AzdoWorkItem[] = [];
  for (const chunk of chunks) {
    const res = await azdoPost<AzdoPagedResponse<AzdoWorkItem>>(
      '/_apis/wit/workitemsbatch',
      {
        ids: chunk,
        fields: fields ?? [
          'System.Id',
          'System.Title',
          'System.State',
          'System.WorkItemType',
          'System.AssignedTo',
          'System.ChangedDate',
          'System.CreatedDate',
          'System.Description',
          'System.Tags',
          'System.TeamProject',
          'Microsoft.VSTS.Common.Priority',
          'Microsoft.VSTS.Common.Severity',
        ],
      },
    );
    results.push(...res.value);
  }
  return results;
}

/** Create a new work item */
export async function createWorkItem(
  project: string,
  type: string,
  ops: JsonPatchOperation[],
): Promise<AzdoWorkItem> {
  return azdoPatch<AzdoWorkItem>(
    `/${encodeURIComponent(project)}/_apis/wit/workitems/${encodeURIComponent('$' + type)}`,
    ops,
    {},
    { headers: { 'Content-Type': 'application/json-patch+json' } },
  );
}

/** Update an existing work item with a set of JSON Patch operations */
export async function updateWorkItem(
  id: number,
  ops: JsonPatchOperation[],
): Promise<AzdoWorkItem> {
  return azdoPatch<AzdoWorkItem>(
    `/_apis/wit/workitems/${id}`,
    ops,
    {},
    { headers: { 'Content-Type': 'application/json-patch+json' } },
  );
}

/** Destroy a work item. hardDelete=true permanently removes it (no recycle bin). */
export async function deleteWorkItem(id: number, hardDelete = false): Promise<void> {
  return azdoDelete(`/_apis/wit/workitems/${id}`, { destroy: hardDelete });
}
