import { injectable } from "@needle-di/core";
import { z } from "zod";
import {
  McpPromptDefinition,
  McpPromptRunResult,
} from "../../../interfaces/mcp/mcp-prompt-interface.ts";

const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;
const DateOnlyRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const PercentageRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

const SaveBalancePromptSchema = z.object({
  bankAccountId: z.number().int().positive().describe("ID of the bank account"),
  balance: z
    .string()
    .regex(MonetaryRegex)
    .describe("The balance amount (format: 123.45, no currency symbol)"),
  currencySymbol: z
    .string()
    .length(3)
    .describe("ISO 4217 currency code (e.g., EUR, USD, GBP)"),
  interestRate: z
    .string()
    .regex(PercentageRegex)
    .optional()
    .describe("Interest rate percentage (format: 2.50 for 2.50%, optional)"),
  interestRateStartDate: z
    .string()
    .regex(DateOnlyRegex)
    .optional()
    .describe(
      "Start date of interest rate period (format: YYYY-MM-DD, optional)"
    ),
  interestRateEndDate: z
    .string()
    .regex(DateOnlyRegex)
    .optional()
    .describe(
      "End date of interest rate period (format: YYYY-MM-DD, optional)"
    ),
  confirmationMessage: z.string().min(1).max(512).optional(),
});

type SaveBalancePromptInput = z.infer<typeof SaveBalancePromptSchema>;

@injectable()
export class SaveBalancePromptService {
  public getDefinition(): McpPromptDefinition {
    return {
      name: "save_balance_confirmation",
      meta: {
        title: "Save bank account balance with confirmation",
        description:
          "Add a balance record to a bank account and provide a confirmation summary with the saved details",
        argsSchema: SaveBalancePromptSchema.shape,
      },
      run: (input: unknown): McpPromptRunResult => {
        const parsed = SaveBalancePromptSchema.parse(input);
        const payload = this.buildPayload(parsed);
        const confirmationMessage = parsed.confirmationMessage?.trim().length
          ? parsed.confirmationMessage.trim()
          : "Confirm that the balance has been added successfully and provide a summary of the balance details.";

        const jsonPayload = JSON.stringify(payload, null, 2);

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Use the bank_accounts.add_balance tool with the following input:",
                  jsonPayload,
                  "",
                  `After adding the balance, ${confirmationMessage}`,
                ].join("\n"),
              },
            },
          ],
        } satisfies McpPromptRunResult;
      },
    } satisfies McpPromptDefinition;
  }

  private buildPayload(input: SaveBalancePromptInput): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      bankAccountId: input.bankAccountId,
      balance: input.balance,
      currencySymbol: input.currencySymbol,
    };

    if (input.interestRate) {
      payload.interestRate = input.interestRate;
    }

    if (input.interestRateStartDate) {
      payload.interestRateStartDate = input.interestRateStartDate;
    }

    if (input.interestRateEndDate) {
      payload.interestRateEndDate = input.interestRateEndDate;
    }

    return payload;
  }
}
