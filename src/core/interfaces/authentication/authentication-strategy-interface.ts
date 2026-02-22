import type { AuthenticationStrategyResultType } from "../../types/authentication/authentication-strategy-result-type.ts";

export interface AuthenticationStrategyInterface {
  authenticate(token: string): Promise<AuthenticationStrategyResultType | null>;
  validateResourceAccess(
    token: string,
    requestUrl: string,
    strategyResult: AuthenticationStrategyResultType,
  ): Promise<void>;
}
