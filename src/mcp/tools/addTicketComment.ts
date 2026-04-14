import { toMcpContent } from '../schemas/outputs.js';
import { ok } from '../../types/toolContracts.js';
import { addComment } from '../../azdo/comments.js';
import { getWorkItem } from '../../azdo/workItems.js';
import { NotFoundError } from '../../utils/errors.js';
import { AddTicketCommentInputType } from '../schemas/inputs.js';
import { auditLog } from '../../utils/logger.js';

export async function handleAddTicketComment(
  args: AddTicketCommentInputType,
): Promise<ReturnType<typeof toMcpContent>> {
  // Resolve the project from the work item (required for comment endpoint)
  const wi = await getWorkItem(args.id, 'fields');
  const project = String(wi.fields['System.TeamProject'] ?? '');
  if (!project) throw new NotFoundError('work item', args.id);

  const comment = await addComment(project, args.id, args.commentText);

  auditLog({ actor: 'mcp', action: 'add_comment', targetId: args.id, project, status: 'success' });

  return toMcpContent(
    ok({
      commentId: comment.id,
      workItemId: comment.workItemId,
      createdDate: comment.createdDate,
    }),
  );
}
