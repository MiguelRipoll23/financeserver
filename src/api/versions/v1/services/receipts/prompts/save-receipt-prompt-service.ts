import { injectable } from "@needle-di/core";
import { z } from "zod";
import {
  McpPromptDefinition,
  McpPromptRunResult,
} from "../../../interfaces/mcp/mcp-prompt-interface.ts";

const DateOnlyRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

const SaveReceiptItemPromptSchema = z.object({
  name: z
    .string()
    .min(1, "Item name must not be empty")
    .max(256, "Item name must be 256 characters or less")
    .describe("Name of the product or item"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .gte(1, "Quantity must be positive")
    .describe("Number of units purchased"),
  unitPrice: z
    .string()
    .regex(
      MonetaryRegex,
      "Unit price must be a valid monetary value (format: 123.45, no currency symbol, dot as decimal separator)"
    )
    .describe(
      "Price per unit without currency symbol, dot as decimal separator"
    ),
});

const SaveReceiptPromptSchema = z.object({
  date: z.string().regex(DateOnlyRegex, "Date must be in YYYY-MM-DD format"),
  items: z
    .array(SaveReceiptItemPromptSchema)
    .min(1, "At least one item is required")
    .describe("List of items purchased on this receipt"),
  confirmationMessage: z.string().min(1).max(512).optional(),
});

type SaveReceiptPromptInput = z.infer<typeof SaveReceiptPromptSchema>;

@injectable()
export class SaveReceiptPromptService {
  public getDefinition(): McpPromptDefinition {
    return {
      name: "save_receipt_confirmation",
      meta: {
        title: "Save receipt with confirmation",
        description:
          "Save a receipt with items and provide a confirmation summary with itemized details and totals",
        argsSchema: SaveReceiptPromptSchema.shape,
      },
      run: (input: unknown): McpPromptRunResult => {
        const parsed = SaveReceiptPromptSchema.parse(input);
        const payload = this.buildPayload(parsed);
        const confirmationMessage = parsed.confirmationMessage?.trim().length
          ? parsed.confirmationMessage.trim()
          : "Confirm that the receipt has been saved successfully and provide a detailed summary showing each item with its quantity, unit price, and line total, plus the overall receipt total.";

        const jsonPayload = JSON.stringify(payload, null, 2);

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Use the save_receipt tool with the following input:",
                  jsonPayload,
                  "",
                  `After saving the receipt, ${confirmationMessage}`,
                ].join("\n"),
              },
            },
          ],
        } satisfies McpPromptRunResult;
      },
    } satisfies McpPromptDefinition;
  }

  private buildPayload(input: SaveReceiptPromptInput): Record<string, unknown> {
    return {
      date: input.date,
      items: input.items,
    };
  }
}
