import { z } from "zod";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { CashSortField } from "../enums/cash-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";

export const CreateCashToolSchema = z.object({
  label: z.string().min(1).max(255).describe("Cash source label"),
});

export const UpdateCashToolSchema = z.object({
  id: z.number().int().positive().describe("Cash source identifier"),
  label: z.string().min(1).max(255).describe("New cash source label"),
});

export const DeleteCashToolSchema = z.object({
  id: z.number().int().positive().describe("Cash source identifier"),
});

export const FilterCashToolSchema = PaginationQuerySchema.extend({
  label: z.string().optional().describe("Filter by cash label"),
  sortField: z.nativeEnum(CashSortField).optional().describe("Sort field"),
  sortOrder: z.nativeEnum(SortOrder).optional().describe("Sort order"),
});
