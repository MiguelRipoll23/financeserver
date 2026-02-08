import { encodeCursor } from "./cursor-utils.ts";
import { OffsetPaginationResponse } from "../interfaces/pagination/offset-pagination-response-interface.ts";

export const createOffsetPagination = <T>(
  items: T[],
  limit: number,
  offset: number,
  total: number,
): OffsetPaginationResponse<T> => ({
  results: items,
  limit,
  offset,
  total,
  nextCursor: offset + limit < total ? encodeCursor(offset + limit) : null,
  previousCursor: offset > 0 ? encodeCursor(Math.max(0, offset - limit)) : null,
});
