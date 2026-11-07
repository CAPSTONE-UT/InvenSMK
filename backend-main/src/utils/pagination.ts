export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

export function toRange(page: number, limit: number): [from: number, to: number] {
  const from = (page - 1) * limit;
  return [from, from + limit - 1];
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    total_pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
