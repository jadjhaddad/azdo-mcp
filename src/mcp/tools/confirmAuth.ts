import { toMcpContent } from '../schemas/outputs.js';
import { ok } from '../../types/toolContracts.js';
import { checkAuth } from '../../services/setupService.js';

export async function handleConfirmAuth(
  _args: Record<string, never>,
): Promise<ReturnType<typeof toMcpContent>> {
  const result = checkAuth();

  if (result.done) {
    return toMcpContent(
      ok({
        status: 'authenticated',
        account: result.account,
        message: 'Authentication complete. All tools are ready to use.',
      }),
    );
  }

  return toMcpContent(
    ok({
      status: 'pending',
      message: 'Still waiting for sign-in. Complete the sign-in in your browser then call confirm_auth again.',
    }),
  );
}
