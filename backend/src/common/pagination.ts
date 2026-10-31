import { PaginationQueryDto } from './pagination-query.dto';

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function paginated<T>(data: T[], total: number, { page, limit }: PaginationQueryDto): Paginated<T> {
  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}
