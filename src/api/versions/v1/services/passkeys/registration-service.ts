import { inject, injectable } from "@needle-di/core";
import {
  generateRegistrationOptions,
  type PublicKeyCredentialCreationOptionsJSON,
  type RegistrationResponseJSON,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { Buffer } from "node:buffer";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { JWTService } from "../../../../../core/services/jwt-service.ts";
import { KVService } from "../../../../../core/services/kv-service.ts";
import { WebAuthnUtils } from "../../../../../core/utils/webauthn-utils.ts";
import { passkeysTable } from "../../../../../db/schema.ts";
import { ServerError } from "../../models/server-error.ts";
import { KV_OPTIONS_EXPIRATION_TIME } from "../../constants/kv-constants.ts";

@injectable()
export class PasskeyRegistrationService {
  constructor(
    private kvService = inject(KVService),
    private databaseService = inject(DatabaseService),
    private jwtService = inject(JWTService),
  ) {}

  public async getRegistrationOptions(
    origin: string,
    requestUrl: string,
    transactionId: string,
    displayName: string,
  ) {
    // Validate origin is allowed
    if (!WebAuthnUtils.isOriginAllowed(origin)) {
      throw new ServerError(
        "ORIGIN_NOT_ALLOWED",
        "Origin is not in the allowed list",
        403,
      );
    }

    const rpID = WebAuthnUtils.getRelyingPartyIDFromOrigin(origin);
    const rpName = WebAuthnUtils.getRelyingPartyName();

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: "User", // Userless, but WebAuthn needs a user handle/name
    });

    // Store options with displayName in KV storage
    await this.kvService.setRegistrationOptions(transactionId, {
      data: { ...options, displayName },
      createdAt: Date.now(),
    });

    return options;
  }

  public async verifyRegistration(
    origin: string,
    requestUrl: string,
    transactionId: string,
    registrationResponse: RegistrationResponseJSON,
  ) {
    // Retrieve and consume registration options from KV
    const registrationOptions = await this.consumeRegistrationOptionsOrThrow(
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

    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: registrationOptions.challenge,
      expectedOrigin: origin,
      expectedRPID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new ServerError(
        "REGISTRATION_VERIFICATION_FAILED",
        "Registration verification failed",
        400,
      );
    }

    // Validate displayName
    const displayName = registrationOptions.displayName;
    if (
      !displayName || typeof displayName !== "string" ||
      displayName.trim().length === 0
    ) {
      throw new ServerError(
        "INVALID_DISPLAY_NAME",
        "Display name is required and must be a non-empty string",
        400,
      );
    }

    // Validate and sanitize transports
    const transports = registrationResponse.response?.transports;
    const sanitizedTransports = Array.isArray(transports) &&
        transports.every((t) => typeof t === "string")
      ? transports as string[]
      : undefined;

    // Save passkey to database with displayName
    const { credential } = verification.registrationInfo;
    await this.databaseService.get().insert(passkeysTable).values({
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: sanitizedTransports,
      displayName: displayName.trim(),
    });

    // Create management token (userless passkeys)
    const token = await this.jwtService.createManagementToken(requestUrl);
    return { token };
  }

  private async consumeRegistrationOptionsOrThrow(
    transactionId: string,
  ): Promise<
    PublicKeyCredentialCreationOptionsJSON & { displayName?: string }
  > {
    const registrationOptions = await this.kvService
      .consumeRegistrationOptionsByTransactionId(
        transactionId,
      );

    if (registrationOptions === null) {
      throw new ServerError(
        "REGISTRATION_OPTIONS_NOT_FOUND",
        "Registration options not found",
        400,
      );
    }

    if (
      registrationOptions.createdAt + KV_OPTIONS_EXPIRATION_TIME <
        Date.now()
    ) {
      throw new ServerError(
        "REGISTRATION_OPTIONS_EXPIRED",
        "Registration options expired",
        400,
      );
    }

    return registrationOptions.data;
  }
}
