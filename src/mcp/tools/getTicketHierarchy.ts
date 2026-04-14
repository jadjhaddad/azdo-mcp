import { toMcpContent } from '../schemas/outputs.js';
import { ok } from '../../types/toolContracts.js';
import { getHierarchyTree } from '../../azdo/hierarchy.js';
import { GetTicketHierarchyInputType } from '../schemas/inputs.js';

export async function handleGetTicketHierarchy(
  args: GetTicketHierarchyInputType,
): Promise<ReturnType<typeof toMcpContent>> {
  const tree = await getHierarchyTree(args.id, args.maxDepth);
  return toMcpContent(ok({ root: tree }));
}
