import { toMcpContent } from '../schemas/outputs.js';
import { ok } from '../../types/toolContracts.js';
import { startSetup } from '../../services/setupService.js';
import { SetupInputType } from '../schemas/inputs.js';

export async function handleSetup(
  args: SetupInputType,
): Promise<ReturnType<typeof toMcpContent>> {
  const { orgUrl, deviceCode } = await startSetup({
    orgUrl: args.orgUrl,
    allowedProjects: args.allowedProjects,
    enableDelete: args.enableDelete,
  });

  return toMcpContent(
    ok({
      status: 'sign_in_required',
      orgUrl,
      signIn: {
        url: deviceCode.verificationUri,
        code: deviceCode.userCode,
        instruction: `Go to ${deviceCode.verificationUri} and enter code: ${deviceCode.userCode}`,
        expiresAt: deviceCode.expiresAt,
      },
      next: 'After signing in, call confirm_auth to complete setup.',
    }),
  );
}
