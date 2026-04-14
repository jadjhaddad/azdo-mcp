import { toMcpContent } from '../schemas/outputs.js';
import { ok } from '../../types/toolContracts.js';
import { executeTransition } from '../../services/transitionService.js';
import { TransitionTicketInputType } from '../schemas/inputs.js';
import { auditLog } from '../../utils/logger.js';

export async function handleTransitionTicket(
  args: TransitionTicketInputType,
): Promise<ReturnType<typeof toMcpContent>> {
  const wi = await executeTransition(args.id, args.toState, args.reason);

  auditLog({ actor: 'mcp', action: 'transition_ticket', targetId: args.id, status: 'success', details: { toState: args.toState } });

  return toMcpContent(
    ok({
      id: wi.id,
      rev: wi.rev,
      newState: wi.fields['System.State'],
      url: wi.url,
    }),
  );
}
