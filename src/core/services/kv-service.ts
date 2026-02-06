import { injectable } from "@needle-di/core";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/types";

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

    // Delete the options after consuming (one-time use)
    await kv.delete(["registration_options", transactionId]);

    return result.value;
  }

  public async setAuthenticationOptions(
    transactionId: string,
    options: AuthenticationOptionsKV
  ): Promise<void> {
    const kv = await this.getKV();
    await kv.set(["authentication_options", transactionId], options);
  }

  public async takeAuthenticationOptionsByTransactionId(
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

    // Delete the options after consuming (one-time use)
    await kv.delete(["authentication_options", transactionId]);

    return result.value;
  }

  public async setUserKey(userId: string, key: string): Promise<void> {
    const kv = await this.getKV();
    await kv.set(["user_keys", userId], key);
  }

  public async getUserKey(userId: string): Promise<string | null> {
    const kv = await this.getKV();
    const result = await kv.get<string>(["user_keys", userId]);
    return result.value;
  }

  public async deleteUserKey(userId: string): Promise<void> {
    const kv = await this.getKV();
    await kv.delete(["user_keys", userId]);
  }

  public async close(): Promise<void> {
    if (this.kv !== null) {
      this.kv.close();
      this.kv = null;
    }
  }
}
