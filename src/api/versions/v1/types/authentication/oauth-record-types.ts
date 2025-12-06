import type { AuthorizationCodeRecord } from "../../interfaces/authentication/authorization-code-record-interface.ts";
import type { RefreshTokenRecord } from "../../interfaces/authentication/refresh-token-record-interface.ts";

export type AuthorizationCodeRecordInputType = Omit<
  AuthorizationCodeRecord,
  "expiresAt"
>;

export type RefreshTokenRecordInputType = Omit<
  RefreshTokenRecord,
  "refreshToken" | "expiresAt"
>;
