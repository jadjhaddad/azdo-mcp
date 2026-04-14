/** Azure DevOps REST API types (api-version 7.2) */

export interface AzdoProject {
  id: string;
  name: string;
  description?: string;
  url: string;
  state: string;
  visibility: string;
  lastUpdateTime?: string;
}

export interface AzdoWorkItem {
  id: number;
  rev: number;
  fields: Record<string, unknown>;
  url: string;
  _links?: Record<string, { href: string }>;
}

export interface AzdoWorkItemReference {
  id: number;
  url: string;
}

export interface AzdoWiqlResult {
  workItems: AzdoWorkItemReference[];
  columns?: Array<{ referenceName: string; name: string; url: string }>;
  queryResultType?: string;
}

export interface AzdoComment {
  id: number;
  workItemId: number;
  text: string;
  createdDate: string;
  modifiedDate: string;
  createdBy: AzdoIdentity;
}

export interface AzdoIdentity {
  displayName: string;
  uniqueName: string;
  id?: string;
}

export interface AzdoPagedResponse<T> {
  count: number;
  value: T[];
}

export interface JsonPatchOperation {
  op: 'add' | 'replace' | 'remove' | 'test';
  path: string;
  value?: unknown;
}

/** Canonical field paths used in JSON Patch operations */
export const FIELD = {
  Title: '/fields/System.Title',
  Description: '/fields/System.Description',
  State: '/fields/System.State',
  AssignedTo: '/fields/System.AssignedTo',
  AreaPath: '/fields/System.AreaPath',
  IterationPath: '/fields/System.IterationPath',
  Tags: '/fields/System.Tags',
  Priority: '/fields/Microsoft.VSTS.Common.Priority',
  Severity: '/fields/Microsoft.VSTS.Common.Severity',
  Reason: '/fields/System.Reason',
  History: '/fields/System.History',
  WorkItemType: '/fields/System.WorkItemType',
  TeamProject: '/fields/System.TeamProject',
  ChangedDate: '/fields/System.ChangedDate',
  CreatedDate: '/fields/System.CreatedDate',
} as const;
