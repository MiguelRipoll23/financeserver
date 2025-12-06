export interface OffsetPaginationResponse<T> {
  results: T[];
  limit: number;
  offset: number;
  total: number;
  nextCursor: string | null;
  previousCursor: string | null;
}
