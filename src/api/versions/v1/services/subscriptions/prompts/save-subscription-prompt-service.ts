import { injectable } from "@needle-di/core";
import { z } from "zod";
import { Recurrence } from "../../../enums/recurrence-enum.ts";
import {
  McpPromptDefinition,
  McpPromptRunResult,
} from "../../../interfaces/mcp/mcp-prompt-interface.ts";

const DateOnlyRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

const SaveSubscriptionPromptSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(256)
    .describe(
      "Subscription service name, e.g., 'Netflix Premium', 'Adobe Creative Cloud', 'Spotify Family'"
    ),
  category: z
    .string()
    .min(1)
    .max(128)
    .describe(
      "Subscription category (in english), e.g., 'Entertainment', 'Software', 'Utilities', 'Fitness'"
    ),
  recurrence: z.nativeEnum(Recurrence),
  amount: z
    .string()
    .regex(
      MonetaryRegex,
      "Amount must be a valid monetary value (format: 15.99)"
    )
    .describe(
      "Subscription amount per billing cycle, e.g., '15.99', '29.00' (no currency symbol, dot as decimal separator)"
    ),
  currencyCode: z
    .string()
    .length(3)
    .describe("Currency code, e.g., 'EUR', 'USD', 'GBP'"),
  plan: z
    .string()
    .min(1)
    .max(128)
    .describe(
      "Subscription plan name, e.g., 'Premium', 'Pro', 'Basic', 'Family'"
    )
    .optional(),
  effectiveFrom: z
    .string()
    .regex(DateOnlyRegex, "Effective from date must be in YYYY-MM-DD format"),
  effectiveUntil: z
    .string()
    .regex(DateOnlyRegex, "Effective until date must be in YYYY-MM-DD format")
    .nullable()
    .optional(),
  confirmationMessage: z.string().min(1).max(512).optional(),
});

type SaveSubscriptionPromptInput = z.infer<typeof SaveSubscriptionPromptSchema>;

@injectable()
export class SaveSubscriptionPromptService {
  public getDefinition(): McpPromptDefinition {
    return {
      name: "save_subscription_confirmation",
      meta: {
        title: "Save subscription with confirmation",
        description:
          "Save a subscription and provide a confirmation summary with the saved details including billing cycle",
        argsSchema: SaveSubscriptionPromptSchema.shape,
      },
      run: (input: unknown): McpPromptRunResult => {
        const parsed = SaveSubscriptionPromptSchema.parse(input);
        const payload = this.buildPayload(parsed);
        const confirmationMessage = parsed.confirmationMessage?.trim().length
          ? parsed.confirmationMessage.trim()
          : "Confirm that the subscription has been saved successfully and provide a summary of the subscription details including name, category, amount, billing frequency, and active status.";

        const jsonPayload = JSON.stringify(payload, null, 2);

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Use the save_subscription tool with the following input:",
                  jsonPayload,
                  "",
                  `After saving the subscription, ${confirmationMessage}`,
                ].join("\n"),
              },
            },
          ],
        } satisfies McpPromptRunResult;
      },
    } satisfies McpPromptDefinition;
  }

  private buildPayload(
    input: SaveSubscriptionPromptInput
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      name: input.name,
      category: input.category,
      recurrence: input.recurrence,
      amount: input.amount,
      currencyCode: input.currencyCode,
      effectiveFrom: input.effectiveFrom,
    };

    if (input.plan) {
      payload.plan = input.plan;
    }

    if (input.effectiveUntil !== undefined) {
      payload.effectiveUntil = input.effectiveUntil;
    }

    return payload;
  }
}
