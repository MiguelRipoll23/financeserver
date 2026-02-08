import { z } from "zod";
import { SubscriptionSortField } from "../enums/subscription-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { Recurrence } from "../enums/recurrence-enum.ts";

const DateOnlyRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

export const SaveSubscriptionToolSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(256, "Name must be between 1-256 characters")
    .describe(
      "The name of the subscription service (e.g., Netflix Premium, Spotify)",
    ),
  category: z
    .string()
    .min(1)
    .max(128, "Category must be between 1-128 characters")
    .describe(
      "The category of the subscription in English (e.g., Entertainment, Utilities, Software)",
    ),
  recurrence: z
    .nativeEnum(Recurrence)
    .describe("How often the subscription renews (weekly, monthly, yearly)"),
  amount: z
    .string()
    .regex(MonetaryRegex, "Amount must be a valid monetary value (e.g., 15.99)")
    .describe(
      "The subscription amount per billing cycle (format: 15.99, no currency symbol)",
    ),
  currencyCode: z
    .string()
    .length(3)
    .describe("Three-letter currency code (e.g., EUR, USD, GBP)"),
  plan: z
    .string()
    .min(1)
    .max(128)
    .optional()
    .describe("The subscription plan name (e.g., Premium, Pro, Basic)"),
  effectiveFrom: z
    .string()
    .regex(DateOnlyRegex, "Effective from date must be in YYYY-MM-DD format")
    .describe(
      "The date when this subscription price becomes effective (format: YYYY-MM-DD)",
    ),
  effectiveUntil: z
    .string()
    .regex(DateOnlyRegex, "Effective until date must be in YYYY-MM-DD format")
    .optional()
    .describe(
      "The date when this subscription price expires (format: YYYY-MM-DD)",
    ),
});

export const UpdateSubscriptionToolSchema = z
  .object({
    id: z
      .number()
      .int()
      .positive()
      .describe("ID of the subscription to update"),
  })
  .merge(SaveSubscriptionToolSchema.partial())
  .refine((data) => Object.keys(data).some((key) => key !== "id"), {
    message: "At least one field to update must be provided besides the ID.",
  });

export const DeleteSubscriptionToolSchema = z.object({
  id: z.number().int().positive().describe("ID of the subscription to delete"),
});

export const FilterSubscriptionsToolSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(256)
    .optional()
    .describe("Filter subscriptions by name (partial match, case insensitive)"),
  category: z
    .string()
    .min(1)
    .max(128)
    .optional()
    .describe(
      "Filter subscriptions by category (partial match, case insensitive)",
    ),
  recurrence: z
    .nativeEnum(Recurrence)
    .optional()
    .describe("Filter subscriptions by recurrence type"),
  minimumAmount: z
    .string()
    .regex(MonetaryRegex)
    .optional()
    .describe(
      "Filter subscriptions with amount greater than or equal to this value (format: 15.99)",
    ),
  maximumAmount: z
    .string()
    .regex(MonetaryRegex)
    .optional()
    .describe(
      "Filter subscriptions with amount less than or equal to this value (format: 15.99)",
    ),
  startDate: z
    .string()
    .regex(DateOnlyRegex)
    .optional()
    .describe(
      "Filter subscriptions from this start date onwards (format: YYYY-MM-DD)",
    ),
  endDate: z
    .string()
    .regex(DateOnlyRegex)
    .optional()
    .describe("Filter subscriptions until this end date (format: YYYY-MM-DD)"),
  isActive: z
    .boolean()
    .optional()
    .describe(
      "Filter by active status (true for active, false for canceled/ended)",
    ),
  currencyCode: z
    .string()
    .length(3)
    .optional()
    .describe("Filter subscriptions by currency code (e.g., EUR, USD, GBP)"),
  sortField: z
    .nativeEnum(SubscriptionSortField)
    .optional()
    .describe("Field to sort subscriptions by"),
  sortOrder: z
    .nativeEnum(SortOrder)
    .optional()
    .describe("Order to sort results (ascending or descending)"),
  limit: z.coerce
    .number()
    .int()
    .gte(1)
    .max(100)
    .optional()
    .describe("Maximum number of subscriptions to return (1-100)"),
  cursor: z
    .string()
    .optional()
    .describe("Pagination cursor for retrieving next page of results"),
});
