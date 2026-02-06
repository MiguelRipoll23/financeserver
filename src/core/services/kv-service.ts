import { injectable } from "@needle-di/core";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";

export interface RegistrationOptionsKV {
  data: PublicKeyCredentialCreationOptionsJSON & { displayName?: string };
  createdAt: number;
}

export interface AuthenticationOptionsKV {
  data: PublicKeyCredentialRequestOptionsJSON;
  createdAt: number;
}

@injectable()
export class KVService {
  private kv: Deno.Kv | null = null;

  private async getKV(): Promise<Deno.Kv> {
    if (this.kv === null) {
      this.kv = await Deno.openKv();
    }
    return this.kv;
  }

  public async setRegistrationOptions(
    transactionId: string,
    options: RegistrationOptionsKV
  ): Promise<void> {
    const kv = await this.getKV();
    await kv.set(["registration_options", transactionId], options);
  }

  public async consumeRegistrationOptionsByTransactionId(
    transactionId: string
  ): Promise<RegistrationOptionsKV | null> {
    const kv = await this.getKV();
    const result = await kv.get<RegistrationOptionsKV>([
      "registration_options",
      transactionId,
    ]);

    if (result.value === null) {
      return null;
    }

    // Atomic delete with version check to prevent TOCTOU races
    const deleteResult = await kv
      .atomic()
      .check({
        key: ["registration_options", transactionId],
        versionstamp: result.versionstamp,
      })
      .delete(["registration_options", transactionId])
      .commit();

    // If commit failed, another consumer already deleted it
    if (!deleteResult.ok) {
      return null;
    }

    return result.value;
  }

  public async setAuthenticationOptions(
    transactionId: string,
    options: AuthenticationOptionsKV
  ): Promise<void> {
    const kv = await this.getKV();
    await kv.set(["authentication_options", transactionId], options);
  }

  public async consumeAuthenticationOptionsByTransactionId(
    transactionId: string
  ): Promise<AuthenticationOptionsKV | null> {
    const kv = await this.getKV();
    const result = await kv.get<AuthenticationOptionsKV>([
      "authentication_options",
      transactionId,
    ]);

    if (result.value === null) {
      return null;
    }

    // Atomic delete with version check to prevent TOCTOU races
    const deleteResult = await kv
      .atomic()
      .check({
        key: ["authentication_options", transactionId],
        versionstamp: result.versionstamp,
      })
      .delete(["authentication_options", transactionId])
      .commit();

    // If commit failed, another consumer already deleted it
    if (!deleteResult.ok) {
      return null;
    }

    return result.value;
  }

  public async close(): Promise<void> {
    if (this.kv !== null) {
      this.kv.close();
      this.kv = null;
    }
  }
}
