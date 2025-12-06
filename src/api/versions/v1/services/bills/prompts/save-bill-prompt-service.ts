import { injectable } from "@needle-di/core";
import { z } from "zod";
import {
  McpPromptDefinition,
  McpPromptRunResult,
} from "../../../interfaces/mcp/mcp-prompt-interface.ts";

const DateOnlyRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

const SaveBillPromptSchema = z.object({
  date: z.string().regex(DateOnlyRegex, "Date must be in YYYY-MM-DD format"),
  category: z
    .string()
    .min(1)
    .max(128)
    .describe(
      "Bill category (in english), e.g., 'electricity', 'water', 'internet', 'gas'"
    ),
  totalAmount: z
    .string()
    .regex(
      MonetaryRegex,
      "Total amount must be a valid monetary value (format: 123.45, no currency symbol, dot as decimal separator)"
    ),
  currencyCode: z
    .string()
    .length(3, "Currency code must be exactly 3 characters (ISO 4217 format)")
    .describe("ISO 4217 currency code (e.g., EUR, USD, GBP)"),
  senderEmail: z
    .string()
    .email("Sender email must be a valid email address")
    .optional(),
  confirmationMessage: z.string().min(1).max(512).optional(),
});

type SaveBillPromptInput = z.infer<typeof SaveBillPromptSchema>;

@injectable()
export class SaveBillPromptService {
  public getDefinition(): McpPromptDefinition {
    return {
      name: "save_bill_confirmation",
      meta: {
        title: "Save bill with confirmation",
        description:
          "Save a bill and provide a confirmation summary with the saved details",
        argsSchema: SaveBillPromptSchema.shape,
      },
      run: (input: unknown): McpPromptRunResult => {
        const parsed = SaveBillPromptSchema.parse(input);
        const payload = this.buildPayload(parsed);
        const confirmationMessage = parsed.confirmationMessage?.trim().length
          ? parsed.confirmationMessage.trim()
          : "Confirm that the bill has been saved successfully and provide a summary of the saved bill details.";

        const jsonPayload = JSON.stringify(payload, null, 2);

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Use the save_bill tool with the following input:",
                  jsonPayload,
                  "",
                  `After saving the bill, ${confirmationMessage}`,
                ].join("\n"),
              },
            },
          ],
        } satisfies McpPromptRunResult;
      },
    } satisfies McpPromptDefinition;
  }

  private buildPayload(input: SaveBillPromptInput): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      date: input.date,
      category: input.category,
      totalAmount: input.totalAmount,
    };

    if (input.currencyCode) {
      payload.currencyCode = input.currencyCode;
    }

    if (input.senderEmail) {
      payload.senderEmail = input.senderEmail;
    }

    return payload;
  }
}
