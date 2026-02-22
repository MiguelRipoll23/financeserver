import type { Payload } from "@wok/djwt";
import type { AuthenticationPrincipalType } from "../../../versions/v1/types/authentication/authentication-principal-type.ts";

export type AuthenticationStrategyResultType = {
  principal: AuthenticationPrincipalType;
  jwtPayload?: Payload;
};
