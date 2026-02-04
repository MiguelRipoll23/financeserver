import { z } from "@hono/zod-openapi";
import { MonetaryStringSchema } from "./monetary-string-schema.ts";

// Investment calculation type enum
export const CalculationTypeSchema = z
  .enum(["interest_rate", "roboadvisor", "crypto"])
  .openapi({
    description: "Type of investment calculation to perform",
  });

// Interest Rate Calculation Request
export const InterestRateCalculationRequestSchema = z.object({
  type: z.literal("interest_rate"),
  bankAccountId: z
    .number()
    .int()
    .openapi({ example: 1 })
    .describe("Bank account identifier"),
  currentBalance: MonetaryStringSchema.openapi({ example: "10000.00" }).describe(
    "Current balance for interest calculation"
  ),
  currencyCode: z
    .string()
    .length(3)
    .openapi({ example: "EUR" })
    .describe("ISO 4217 currency code"),
});

// Roboadvisor Calculation Request
export const RoboadvisorCalculationRequestSchema = z.object({
  type: z.literal("roboadvisor"),
  roboadvisorId: z
    .number()
    .int()
    .openapi({ example: 1 })
    .describe("Roboadvisor identifier"),
});

// Crypto Calculation Request
export const CryptoCalculationRequestSchema = z.object({
  type: z.literal("crypto"),
  cryptoExchangeId: z
    .number()
    .int()
    .openapi({ example: 1 })
    .describe("Crypto exchange identifier"),
  symbolCode: z
    .string()
    .min(1)
    .max(10)
    .openapi({ example: "BTC" })
    .describe("Cryptocurrency symbol"),
});

// Union of all calculation requests
export const CalculationRequestSchema = z.discriminatedUnion("type", [
  InterestRateCalculationRequestSchema,
  RoboadvisorCalculationRequestSchema,
  CryptoCalculationRequestSchema,
]);

export type CalculationRequest = z.infer<typeof CalculationRequestSchema>;

// Calculation Response Data
export const CalculationDataSchema = z.object({
  monthlyProfitAfterTax: z.string().optional().openapi({ example: "25.00" }),
  annualProfitAfterTax: z.string().optional().openapi({ example: "300.00" }),
  currentValueAfterTax: z.string().optional().openapi({ example: "95000.00" }),
  currencyCode: z.string().openapi({ example: "EUR" }),
});

// Calculation Response
export const CalculationResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  message: z.string().openapi({
    example: "Interest rate calculation completed successfully",
  }),
  calculationType: CalculationTypeSchema,
  data: CalculationDataSchema.optional(),
});

export type CalculationResponse = z.infer<typeof CalculationResponseSchema>;
