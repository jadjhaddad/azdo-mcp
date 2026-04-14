import { azdoGet } from './client.js';

export interface WorkItemTypeState {
  name: string;
  color: string;
  category: string;
}

interface WorkItemTypeStatesResponse {
  count: number;
  value: WorkItemTypeState[];
}

/**
 * Fetch valid states for a given work item type in a project.
 * Used to validate transition targets before patching.
 */
export async function getValidStates(
  project: string,
  workItemType: string,
): Promise<WorkItemTypeState[]> {
  const res = await azdoGet<WorkItemTypeStatesResponse>(
    `/${encodeURIComponent(project)}/_apis/wit/workitemtypes/${encodeURIComponent(workItemType)}/states`,
  );
  return res.value;
}
