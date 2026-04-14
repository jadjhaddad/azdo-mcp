/** Pagination helpers */

export interface PageParams {
  top: number;
  skip: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount?: number;
  hasMore: boolean;
  skip: number;
  top: number;
}

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = parseInt(process.env.MAX_PAGE_SIZE ?? '200', 10);

export function clampPageSize(requested?: number): number {
  if (!requested || requested < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(requested, MAX_PAGE_SIZE);
}

export function buildPagedResult<T>(
  items: T[],
  params: PageParams,
  totalCount?: number,
): PagedResult<T> {
  return {
    items,
    totalCount,
    hasMore: items.length === params.top,
    skip: params.skip,
    top: params.top,
  };
}
