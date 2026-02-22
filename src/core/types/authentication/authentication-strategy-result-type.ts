import type { AuthenticationPrincipalType } from "./authentication-principal-type.ts";

export type AuthenticationStrategyResultType = {
  principal: AuthenticationPrincipalType;
  jwtPayload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};
