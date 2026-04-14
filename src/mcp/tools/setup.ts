import { toMcpContent } from '../schemas/outputs.js';
import { ok } from '../../types/toolContracts.js';
import { runSetup } from '../../services/setupService.js';
import { SetupInputType } from '../schemas/inputs.js';

export async function handleSetup(
  args: SetupInputType,
): Promise<ReturnType<typeof toMcpContent>> {
  const result = await runSetup({
    orgUrl: args.orgUrl,
    allowedProjects: args.allowedProjects,
    enableDelete: args.enableDelete,
  });

  return toMcpContent(
    ok({
      message: 'Setup complete. All tools are ready to use.',
      orgUrl: result.orgUrl,
      allowedProjects: result.allowedProjects.length
        ? result.allowedProjects
        : 'all accessible projects',
      deleteEnabled: result.enableDelete,
      authenticated: result.authenticated,
    }),
  );
}
