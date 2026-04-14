import { toMcpContent } from '../schemas/outputs.js';
import { ok } from '../../types/toolContracts.js';
import { listProjects as azdoListProjects } from '../../azdo/projects.js';
import { isProjectAllowed } from '../../config/policy.js';
import { ListProjectsInputType } from '../schemas/inputs.js';

export async function handleListProjects(
  _args: ListProjectsInputType,
): Promise<ReturnType<typeof toMcpContent>> {
  const all = await azdoListProjects();

  // Filter to allowed projects (if allowlist configured)
  const visible = all.filter((p) => isProjectAllowed(p.name));

  return toMcpContent(
    ok({
      count: visible.length,
      projects: visible.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        state: p.state,
        visibility: p.visibility,
        lastUpdated: p.lastUpdateTime,
      })),
    }),
  );
}
