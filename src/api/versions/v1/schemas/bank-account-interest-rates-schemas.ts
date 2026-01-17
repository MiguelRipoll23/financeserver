import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { DateOnlyStringSchema } from "./date-only-string-schema.ts";

// Bank Account Interest Rate schemas
export const CreateBankAccountInterestRateRequestSchema = z
  .object({
    bankAccountId: z
      .number()
      .int()
      .openapi({ example: 1 })
      .describe("Bank account identifier"),
    interestRate: z
      .string()
      .regex(/^[0-9]+(\.[0-9]{1,2})?$/)
      .refine((val) => {
        const num = parseFloat(val);
        return num >= 0 && num <= 999.99;
      }, "Interest rate must be between 0 and 999.99")
      .openapi({ example: "2.50" })
      .describe("Interest rate percentage (e.g., 2.50 for 2.50%)"),
    interestRateStartDate: DateOnlyStringSchema.describe(
      "Start date of interest rate period in YYYY-MM-DD format"
    ),
    interestRateEndDate: DateOnlyStringSchema.nullable().optional().describe(
      "End date of interest rate period in YYYY-MM-DD format"
    ),
  })
  .refine(
    (data) => {
      if (!data.interestRateEndDate) return true;
      return (
        new Date(data.interestRateEndDate) >=
        new Date(data.interestRateStartDate)
      );
    },
    {
      message: "End date cannot be before start date",
      path: ["interestRateEndDate"],
    }
  );

export type CreateBankAccountInterestRateRequest = z.infer<
  typeof CreateBankAccountInterestRateRequestSchema
>;

export const CreateBankAccountInterestRateResponseSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  bankAccountId: z.number().int().openapi({ example: 1 }),
  interestRate: z.string().openapi({ example: "2.50" }),
  interestRateStartDate: z.string().openapi({ example: "2026-01-01" }),
  interestRateEndDate: z.string().nullable().openapi({ example: "2026-12-31" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export type CreateBankAccountInterestRateResponse = z.infer<
  typeof CreateBankAccountInterestRateResponseSchema
>;

export const BankAccountInterestRateIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({
      param: {
        name: "id",
        in: "path",
      },
      example: 1,
    }),
});

export type BankAccountInterestRateIdParam = z.infer<
  typeof BankAccountInterestRateIdParamSchema
>;

export const GetBankAccountInterestRatesRequestSchema = PaginationQuerySchema.extend(
  {
    bankAccountId: z
      .number()
      .int()
      .optional()
      .openapi({ example: 1, type: "integer" })
      .describe("Bank account identifier"),
    sortOrder: z
      .nativeEnum(SortOrder)
      .optional()
      .openapi({ example: SortOrder.Desc }),
  }
);

export type GetBankAccountInterestRatesRequest = z.infer<
  typeof GetBankAccountInterestRatesRequestSchema
>;

export const BankAccountInterestRateSummarySchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  bankAccountId: z.number().int().openapi({ example: 1 }),
  interestRate: z.string().openapi({ example: "2.50" }),
  interestRateStartDate: z.string().openapi({ example: "2026-01-01" }),
  interestRateEndDate: z.string().nullable().openapi({ example: "2026-12-31" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export const GetBankAccountInterestRatesResponseSchema = z.object({
  data: z.array(BankAccountInterestRateSummarySchema),
  nextCursor: z.string().nullable(),
});

export type GetBankAccountInterestRatesResponse = z.infer<
  typeof GetBankAccountInterestRatesResponseSchema
>;

export const UpdateBankAccountInterestRateRequestSchema = z
  .object({
    interestRate: z
      .string()
      .regex(/^[0-9]+(\.[0-9]{1,2})?$/)
      .optional()
      .openapi({ example: "2.50" })
      .describe("Interest rate percentage (e.g., 2.50 for 2.50%)"),
    interestRateStartDate: DateOnlyStringSchema.optional().describe(
      "Start date of interest rate period in YYYY-MM-DD format"
    ),
    interestRateEndDate: DateOnlyStringSchema.nullable().optional().describe(
      "End date of interest rate period in YYYY-MM-DD format"
    ),
  })
  .refine(
    (data) => {
      if (!data.interestRateStartDate || !data.interestRateEndDate) return true;
      return (
        new Date(data.interestRateEndDate) >=
        new Date(data.interestRateStartDate)
      );
    },
    {
      message: "End date cannot be before start date",
      path: ["interestRateEndDate"],
    }
  );

export type UpdateBankAccountInterestRateRequest = z.infer<
  typeof UpdateBankAccountInterestRateRequestSchema
>;

export const UpdateBankAccountInterestRateResponseSchema =
  CreateBankAccountInterestRateResponseSchema;

export type UpdateBankAccountInterestRateResponse = z.infer<
  typeof UpdateBankAccountInterestRateResponseSchema
>;
