import { deleteWorkItem } from '../azdo/workItems.js';
import { isDeleteEnabled, expectedDeleteToken } from '../config/policy.js';
import { ForbiddenError, ValidationError } from '../utils/errors.js';
import { auditLog, logger } from '../utils/logger.js';

export async function executeDelete(opts: {
  id: number;
  confirm?: string;
  hardDelete: boolean;
}): Promise<void> {
  // Gate 1 — feature flag
  if (!isDeleteEnabled()) {
    throw new ForbiddenError(
      'delete_ticket is disabled. Set ENABLE_DELETE=true in environment to enable.',
    );
  }

  // Gate 2 — confirmation token
  const required = expectedDeleteToken(opts.id);
  if (opts.confirm !== required) {
    throw new ValidationError(
      `Confirmation token required. Pass confirm="${required}" to proceed.`,
      { required },
    );
  }

  // Gate 3 — hard delete always blocked unless explicitly enabled via policy extension
  if (opts.hardDelete) {
    throw new ForbiddenError(
      'hardDelete is permanently disabled in this server. Tickets go to the recycle bin.',
    );
  }

  logger.warn({ id: opts.id }, 'Deleting work item');

  await deleteWorkItem(opts.id, false);

  auditLog({
    actor: 'mcp',
    action: 'delete_ticket',
    targetId: opts.id,
    status: 'success',
    details: { hardDelete: false },
  });
}
