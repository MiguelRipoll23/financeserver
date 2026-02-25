import type { ModelMessage } from "ai";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import type { OAuthRequestData } from "../../api/versions/v1/interfaces/authentication/oauth-request-data-interface.ts";
import type { RegistrationOptionsKV } from "../../api/versions/v1/interfaces/authentication/registration-options-kv-interface.ts";
import type { AuthenticationOptionsKV } from "../../api/versions/v1/interfaces/authentication/authentication-options-kv-interface.ts";

export class KVService {
  private kv: Deno.Kv | null = null;

  private async getKV(): Promise<Deno.Kv> {
    if (this.kv === null) {
      this.kv = await Deno.openKv();
    }
    return this.kv;
  }

  public async getConversationHistory(
    sessionId: string,
  ): Promise<ModelMessage[] | null> {
    const kv = await this.getKV();
    const result = await kv.get<ModelMessage[]>(["conversation", sessionId]);
    return result.value || null;
  }

  public async setConversationHistory(
    sessionId: string,
    messages: ModelMessage[],
    ttlMs: number,
  ): Promise<void> {
    const kv = await this.getKV();
    await kv.set(["conversation", sessionId], messages, { expireIn: ttlMs });
  }

  public async setRegistrationOptions(
    transactionId: string,
    options: RegistrationOptionsKV,
  ): Promise<void> {
    const kv = await this.getKV();
    await kv.set(["registration_options", transactionId], options);
  }

  public async consumeRegistrationOptionsByTransactionId(
    transactionId: string,
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
    options: AuthenticationOptionsKV,
  ): Promise<void> {
    const kv = await this.getKV();
    await kv.set(["authentication_options", transactionId], options);
  }

  public async consumeAuthenticationOptionsByTransactionId(
    transactionId: string,
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

  public close(): void {
    if (this.kv !== null) {
      this.kv.close();
      this.kv = null;
    }
  }

  public async setOAuthRequest(
    requestId: string,
    data: OAuthRequestData,
    ttlMs: number,
  ): Promise<void> {
    const kv = await this.getKV();
    await kv.set(["oauth_request", requestId], data, { expireIn: ttlMs });
  }

  public async getOAuthRequest(
    requestId: string,
  ): Promise<OAuthRequestData | null> {
    const kv = await this.getKV();
    const result = await kv.get<OAuthRequestData>(["oauth_request", requestId]);
    return result.value;
  }

  public async updateOAuthRequestStatus(
    requestId: string,
    status: "approved" | "denied",
  ): Promise<boolean> {
    const kv = await this.getKV();
    const result = await kv.get<OAuthRequestData>(["oauth_request", requestId]);

    if (result.value === null) {
      return false;
    }

    const updatedData: OAuthRequestData = {
      ...result.value,
      status,
    };

    // Calculate remaining TTL from original expiration
    const now = Date.now();
    const ttl = result.value.expiresAt - now;

    const updateResult = await kv
      .atomic()
      .check({
        key: ["oauth_request", requestId],
        versionstamp: result.versionstamp,
      })
      .set(
        ["oauth_request", requestId],
        updatedData,
        ttl > 0 ? { expireIn: ttl } : undefined,
      )
      .commit();

    return updateResult.ok;
  }

  public async consumeOAuthRequest(
    requestId: string,
  ): Promise<OAuthRequestData | null> {
    const kv = await this.getKV();
    const result = await kv.get<OAuthRequestData>(["oauth_request", requestId]);

    if (result.value === null) {
      return null;
    }

    const deleteResult = await kv
      .atomic()
      .check({
        key: ["oauth_request", requestId],
        versionstamp: result.versionstamp,
      })
      .delete(["oauth_request", requestId])
      .commit();

    if (!deleteResult.ok) {
      return null;
    }

    return result.value;
  }
}
