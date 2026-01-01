export interface MerchantsFilter {
  name?: string;
  sortOrder?: "ASC" | "DESC";
  limit?: number;
  cursor?: string;
}
