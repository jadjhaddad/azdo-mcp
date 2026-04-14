import { azdoGet } from './client.js';
import { AzdoProject, AzdoPagedResponse } from '../types/azdo.js';

export async function listProjects(): Promise<AzdoProject[]> {
  const res = await azdoGet<AzdoPagedResponse<AzdoProject>>('/_apis/projects', {
    stateFilter: 'wellFormed',
    $top: 500,
  });
  return res.value;
}
