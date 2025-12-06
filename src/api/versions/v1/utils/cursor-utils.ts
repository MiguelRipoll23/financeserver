export const encodeCursor = (offset: number): string => btoa(offset.toString());

export const decodeCursor = (cursor?: string | null): number =>
  cursor ? Number.parseInt(atob(cursor), 10) : 0;
