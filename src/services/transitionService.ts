import { getValidStates } from '../azdo/transitions.js';
import { getWorkItem } from '../azdo/workItems.js';
import { updateWorkItem } from '../azdo/workItems.js';
import { AzdoWorkItem, FIELD, JsonPatchOperation } from '../types/azdo.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Validate that `toState` is a known state for the work item's type,
 * then patch the item. Returns the updated work item.
 */
export async function executeTransition(
  id: number,
  toState: string,
  reason?: string,
): Promise<AzdoWorkItem> {
  const wi = await getWorkItem(id, 'fields');

  const project = String(wi.fields['System.TeamProject'] ?? '');
  const workItemType = String(wi.fields['System.WorkItemType'] ?? '');

  if (!project || !workItemType) {
    throw new NotFoundError('work item', id);
  }

  // Validate target state against workflow metadata
  try {
    const validStates = await getValidStates(project, workItemType);
    const stateNames = validStates.map((s) => s.name.toLowerCase());
    if (!stateNames.includes(toState.toLowerCase())) {
      throw new ValidationError(
        `Invalid state "${toState}" for ${workItemType}. Valid states: ${validStates.map((s) => s.name).join(', ')}`,
      );
    }
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    // If we can't fetch states (e.g. permissions), log and proceed
    logger.warn({ err, id, toState }, 'Could not validate transition state — proceeding anyway');
  }

  const ops: JsonPatchOperation[] = [{ op: 'add', path: FIELD.State, value: toState }];
  if (reason) {
    ops.push({ op: 'add', path: FIELD.Reason, value: reason });
  }

  return updateWorkItem(id, ops);
}
