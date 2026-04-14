import { azdoPost } from './client.js';
import { AzdoComment } from '../types/azdo.js';

export async function addComment(
  project: string,
  workItemId: number,
  text: string,
): Promise<AzdoComment> {
  return azdoPost<AzdoComment>(
    `/${encodeURIComponent(project)}/_apis/wit/workItems/${workItemId}/comments`,
    { text },
  );
}
