import { getEnv } from './env.js';

/** Fields callers are allowed to set via update_ticket / create_ticket */
export const WRITABLE_FIELDS = new Set([
  'System.Title',
  'System.Description',
  'System.State',
  'System.AssignedTo',
  'System.AreaPath',
  'System.IterationPath',
  'System.Tags',
  'Microsoft.VSTS.Common.Priority',
  'Microsoft.VSTS.Common.Severity',
  'System.Reason',
]);

export function isWritableField(fieldRef: string): boolean {
  return WRITABLE_FIELDS.has(fieldRef);
}

/** Returns allowed project list; empty = allow all accessible to token */
export function getAllowedProjects(): string[] {
  return getEnv().AZDO_ALLOWED_PROJECTS;
}

/** True if given project is within policy scope */
export function isProjectAllowed(project: string): boolean {
  const allowed = getAllowedProjects();
  if (allowed.length === 0) return true; // open scope
  return allowed.some((p) => p.toLowerCase() === project.toLowerCase());
}

/** True when delete feature gate is enabled */
export function isDeleteEnabled(): boolean {
  return getEnv().ENABLE_DELETE;
}

/**
 * Expected confirmation token format: DELETE-<id>
 * Caller must pass this exact string to proceed with deletion.
 */
export function expectedDeleteToken(id: number): string {
  return `DELETE-${id}`;
}
