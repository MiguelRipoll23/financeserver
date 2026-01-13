import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { McpPromptDefinition } from "../../interfaces/mcp/mcp-prompt-interface.ts";
import { CreateBankAccountToolService } from "./tools/create-bank-account-tool-service.ts";
import { UpdateBankAccountToolService } from "./tools/update-bank-account-tool-service.ts";
import { DeleteBankAccountToolService } from "./tools/delete-bank-account-tool-service.ts";
import { FilterBankAccountsToolService } from "./tools/filter-bank-accounts-tool-service.ts";
import { SaveBankAccountPromptService } from "./prompts/save-bank-account-prompt-service.ts";
import { FilterBankAccountsPromptService } from "./prompts/filter-bank-accounts-prompt-service.ts";

@injectable()
export class BankAccountsMCPService {
  constructor(
    private createBankAccountToolService = inject(
      CreateBankAccountToolService
    ),
    private updateBankAccountToolService = inject(
      UpdateBankAccountToolService
    ),
    private deleteBankAccountToolService = inject(
      DeleteBankAccountToolService
    ),
    private filterBankAccountsToolService = inject(
      FilterBankAccountsToolService
    ),
    private saveBankAccountPromptService = inject(
      SaveBankAccountPromptService
    ),
    private filterBankAccountsPromptService = inject(
      FilterBankAccountsPromptService
    )
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.createBankAccountToolService.getDefinition(),
      this.updateBankAccountToolService.getDefinition(),
      this.deleteBankAccountToolService.getDefinition(),
      this.filterBankAccountsToolService.getDefinition(),
    ];
  }

  public getPrompts(): McpPromptDefinition[] {
    return [
      this.saveBankAccountPromptService.getDefinition(),
      this.filterBankAccountsPromptService.getDefinition(),
    ];
  }
}
