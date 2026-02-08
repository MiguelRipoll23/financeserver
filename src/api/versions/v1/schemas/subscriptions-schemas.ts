import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { SubscriptionSortField } from "../enums/subscription-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { Recurrence } from "../enums/recurrence-enum.ts";
import { DateOnlyStringSchema } from "./date-only-string-schema.ts";
import { MonetaryStringSchema } from "./monetary-string-schema.ts";

export const UpsertSubscriptionRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(256)
    .describe("Name of the subscription service")
    .openapi({ example: "Netflix" }),
  category: z
    .string()
    .min(1)
    .max(128)
    .describe("Category of the subscription")
    .openapi({ example: "Entertainment" }),
  recurrence: z
    .nativeEnum(Recurrence)
    .describe("Recurrence interval for the subscription")
    .openapi({ example: Recurrence.Monthly }),
  amount: MonetaryStringSchema.describe(
    "Subscription price amount as a string",
  ),
  currencyCode: z
    .string()
    .length(3)
    .describe("ISO 4217 currency code")
    .openapi({ example: "USD" }),
  effectiveFrom: DateOnlyStringSchema.describe(
    "Start date of the subscription",
  ),
  effectiveUntil: DateOnlyStringSchema.nullable()
    .optional()
    .describe("End date of the subscription, nullable and optional"),
  plan: z
    .string()
    .min(1)
    .max(128)
    .describe("Subscription plan name, nullable and optional")
    .openapi({ example: "Standard" })
    .nullable()
    .optional(),
});

export type UpsertSubscriptionRequest = z.infer<
  typeof UpsertSubscriptionRequestSchema
>;

export const UpsertSubscriptionResponseSchema = z.object({
  id: z
    .number()
    .int()
    .describe("Unique identifier for the subscription")
    .openapi({ example: 12 }),
  name: z
    .string()
    .describe("Name of the subscription service")
    .openapi({ example: "Netflix" }),
  category: z
    .string()
    .describe("Category of the subscription")
    .openapi({ example: "Entertainment" }),
  recurrence: z
    .string()
    .describe("Recurrence interval for the subscription")
    .openapi({ example: "monthly" }),
  amount: MonetaryStringSchema.describe(
    "Subscription price amount as a string",
  ),
  currencyCode: z
    .string()
    .describe("ISO 4217 currency code")
    .openapi({ example: "USD" }),
  effectiveFrom: z
    .string()
    .describe("Start date of the subscription in ISO format")
    .openapi({ example: "2025-03-14T00:00:00.000Z" }),
  effectiveUntil: z
    .string()
    .nullable()
    .describe("End date of the subscription in ISO format, nullable")
    .openapi({ example: "2025-12-31T00:00:00.000Z" }),
  plan: z
    .string()
    .nullable()
    .describe("Subscription plan name, nullable")
    .openapi({ example: "Standard" }),
  updatedAt: z
    .string()
    .describe("Last update timestamp in ISO format")
    .openapi({ example: "2025-03-14T12:34:56.000Z" }),
});

export type UpsertSubscriptionResponse = z.infer<
  typeof UpsertSubscriptionResponseSchema
>;

export const SubscriptionSummarySchema = UpsertSubscriptionResponseSchema;
export type SubscriptionSummaryResponse = z.infer<
  typeof SubscriptionSummarySchema
>;

export const SubscriptionIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .describe("Unique identifier for the subscription")
    .openapi({ example: 42 }),
});

export type SubscriptionIdParams = z.infer<typeof SubscriptionIdParamSchema>;

export const GetSubscriptionsRequestSchema = PaginationQuerySchema.extend({
  name: z
    .string()
    .min(1)
    .max(256)
    .describe("Filter by subscription name")
    .openapi({ example: "Netflix" })
    .optional(),
  category: z
    .string()
    .min(1)
    .max(128)
    .describe("Filter by subscription category")
    .openapi({ example: "Entertainment" })
    .optional(),
  recurrence: z
    .nativeEnum(Recurrence)
    .describe("Filter by recurrence interval")
    .openapi({ example: Recurrence.Monthly })
    .optional(),
  minimumAmount: MonetaryStringSchema.describe(
    "Minimum subscription amount filter",
  ).optional(),
  maximumAmount: MonetaryStringSchema.describe(
    "Maximum subscription amount filter",
  ).optional(),
  startDate: DateOnlyStringSchema.describe("Filter by start date").optional(),
  endDate: DateOnlyStringSchema.describe("Filter by end date").optional(),
  isActive: z
    .string()
    .transform((val) => val === "true")
    .describe("Filter by active status (true/false)")
    .openapi({ example: "true" })
    .optional(),
  currencyCode: z
    .string()
    .length(3)
    .describe("Filter by ISO 4217 currency code")
    .openapi({ example: "USD" })
    .optional(),
  sortField: z
    .nativeEnum(SubscriptionSortField)
    .describe("Field to sort results by")
    .openapi({ example: SubscriptionSortField.StartDate })
    .optional(),
  sortOrder: z
    .nativeEnum(SortOrder)
    .describe("Sort order (asc/desc)")
    .openapi({ example: SortOrder.Desc })
    .optional(),
});

export type GetSubscriptionsRequest = z.infer<
  typeof GetSubscriptionsRequestSchema
>;

export const GetSubscriptionsResponseSchema = z.object({
  results: z
    .array(SubscriptionSummarySchema)
    .describe("List of subscription summaries for the current page"),
  limit: z.number().int().describe("Maximum number of results per page"),
  offset: z.number().int().describe("Offset of the first result in the page"),
  total: z.number().int().describe("Total number of results available"),
  nextCursor: z
    .string()
    .nullable()
    .describe("Cursor for the next page, nullable if none"),
  previousCursor: z
    .string()
    .nullable()
    .describe("Cursor for the previous page, nullable if none"),
});

export type GetSubscriptionsResponse = z.infer<
  typeof GetSubscriptionsResponseSchema
>;

export const UpdateSubscriptionRequestSchema = UpsertSubscriptionRequestSchema;
export type UpdateSubscriptionRequest = z.infer<
  typeof UpdateSubscriptionRequestSchema
>;

export const UpdateSubscriptionResponseSchema =
  UpsertSubscriptionResponseSchema;
export type UpdateSubscriptionResponse = z.infer<
  typeof UpdateSubscriptionResponseSchema
>;
