export interface PageParams {
  page?: number;
  pageSize?: number;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface PageResult<T> extends PageMeta {
  items: T[];
}

export function normalizePagination({ page, pageSize }: PageParams): {
  page: number;
  pageSize: number;
  skip: number;
} {
  const normalizedPage = Number.isFinite(page) && page && page > 0 ? page : 1;
  const normalizedPageSize =
    Number.isFinite(pageSize) && pageSize && pageSize > 0 ? pageSize : 20;

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    skip: (normalizedPage - 1) * normalizedPageSize,
  };
}
