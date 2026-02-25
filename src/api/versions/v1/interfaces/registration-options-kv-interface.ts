import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/server";

export interface RegistrationOptionsKV {
  data: PublicKeyCredentialCreationOptionsJSON & { displayName?: string };
  createdAt: number;
}
