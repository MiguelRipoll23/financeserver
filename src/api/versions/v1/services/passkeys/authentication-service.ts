import { inject, injectable } from "@needle-di/core";
import {
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  generateAuthenticationOptions,
  type PublicKeyCredentialRequestOptionsJSON,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { Buffer } from "node:buffer";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { JWTService } from "../../../../../core/services/jwt-service.ts";
import { KVService } from "../../../../../core/services/kv-service.ts";
import { WebAuthnUtils } from "../../../../../core/utils/webauthn-utils.ts";
import { passkeysTable } from "../../../../../db/schema.ts";
import type { PasskeyEntity } from "../../../../../db/tables/passkeys-table.ts";
import { ServerError } from "../../models/server-error.ts";
import { KV_OPTIONS_EXPIRATION_TIME } from "../../constants/kv-constants.ts";

@injectable()
export class PasskeyAuthenticationService {
  constructor(
    private kvService = inject(KVService),
    private databaseService = inject(DatabaseService),
    private jwtService = inject(JWTService),
  ) {}

  public async getLoginOptions(origin: string, transactionId: string) {
    // Validate origin is allowed
    if (!WebAuthnUtils.isOriginAllowed(origin)) {
      throw new ServerError(
        "ORIGIN_NOT_ALLOWED",
        "Origin is not in the allowed list",
        403,
      );
    }

    const rpID = WebAuthnUtils.getRelyingPartyIDFromOrigin(origin);
    const options = await generateAuthenticationOptions({ rpID });

    // Store options in KV storage
    await this.kvService.setAuthenticationOptions(transactionId, {
      data: options,
      createdAt: Date.now(),
    });

    return options;
  }

  public async verifyLogin(
    origin: string,
    requestUrl: string,
    transactionId: string,
    authenticationResponse: AuthenticationResponseJSON,
  ) {
    // Retrieve and consume authentication options from KV
    const authenticationOptions = await this.getAuthenticationOptionsOrThrow(
      transactionId,
    );

    // Validate origin is allowed
    if (!WebAuthnUtils.isOriginAllowed(origin)) {
      throw new ServerError(
        "ORIGIN_NOT_ALLOWED",
        "Origin is not in the allowed list",
        403,
      );
    }

    const expectedRPID = WebAuthnUtils.getRelyingPartyIDFromOrigin(origin);

    // Retrieve passkey from DB
    const passkey = await this.databaseService
      .get()
      .select()
      .from(passkeysTable)
      .where(eq(passkeysTable.id, authenticationResponse.id))
      .limit(1)
      .then((res: PasskeyEntity[]) => res[0]);

    if (!passkey) {
      throw new ServerError("INVALID_CREDENTIAL", "Credential not found", 400);
    }

    const verification = await verifyAuthenticationResponse({
      response: authenticationResponse,
      expectedChallenge: authenticationOptions.challenge,
      expectedOrigin: origin,
      expectedRPID,
      credential: {
        id: passkey.id,
        publicKey: new Uint8Array(
          Buffer.from(passkey.publicKey, "base64url"),
        ),
        counter: Number(passkey.counter),
        transports: passkey.transports
          ? (passkey.transports as AuthenticatorTransportFuture[])
          : undefined,
      },
    });

    if (!verification.verified) {
      throw new ServerError(
        "AUTHENTICATION_FAILED",
        "Authentication failed",
        400,
      );
    }

    // Update counter
    const { newCounter } = verification.authenticationInfo;
    await this.databaseService
      .get()
      .update(passkeysTable)
      .set({
        counter: newCounter,
        lastUsedAt: new Date(),
      })
      .where(eq(passkeysTable.id, passkey.id));

    // Create management token (userless passkeys)
    const token = await this.jwtService.createManagementToken(requestUrl);
    return { token };
  }

  private async getAuthenticationOptionsOrThrow(
    transactionId: string,
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const authenticationOptions = await this.kvService
      .consumeAuthenticationOptionsByTransactionId(
        transactionId,
      );

    if (authenticationOptions === null) {
      throw new ServerError(
        "AUTHENTICATION_OPTIONS_NOT_FOUND",
        "Authentication options not found",
        400,
      );
    }

    if (
      authenticationOptions.createdAt + KV_OPTIONS_EXPIRATION_TIME <
        Date.now()
    ) {
      throw new ServerError(
        "AUTHENTICATION_OPTIONS_EXPIRED",
        "Authentication options expired",
        400,
      );
    }

    return authenticationOptions.data;
  }
}
