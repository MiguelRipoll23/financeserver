import { injectable } from "@needle-di/core";
import { z } from "zod";
import {
  McpPromptDefinition,
  McpPromptRunResult,
} from "../../../interfaces/mcp/mcp-prompt-interface.ts";

const SaveMerchantPromptSchema = z.object({
  name: z.string().min(1).max(255).describe("The name of the merchant"),
  confirmationMessage: z.string().min(1).max(512).optional(),
});

type SaveMerchantPromptInput = z.infer<typeof SaveMerchantPromptSchema>;

@injectable()
export class SaveMerchantPromptService {
  public getDefinition(): McpPromptDefinition {
    return {
      name: "save_merchant_confirmation",
      meta: {
        title: "Save merchant with confirmation",
        description:
          "Save a merchant and provide a confirmation summary with the saved details",
        argsSchema: SaveMerchantPromptSchema.shape,
      },
      run: (input: unknown): McpPromptRunResult => {
        const parsed = SaveMerchantPromptSchema.parse(input);
        const payload = this.buildPayload(parsed);
        const confirmationMessage = parsed.confirmationMessage?.trim().length
          ? parsed.confirmationMessage.trim()
          : "Confirm that the merchant has been saved successfully and provide a summary of the saved merchant details.";

        const jsonPayload = JSON.stringify(payload, null, 2);

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Use the merchants.save tool with the following input:",
                  jsonPayload,
                  "",
                  `After saving the merchant, ${confirmationMessage}`,
                ].join("\n"),
              },
            },
          ],
        } satisfies McpPromptRunResult;
      },
    } satisfies McpPromptDefinition;
  }

  private buildPayload(input: SaveMerchantPromptInput): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      name: input.name,
    };

    return payload;
  }
}
