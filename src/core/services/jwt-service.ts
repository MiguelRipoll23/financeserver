import { create, Payload, verify } from "@wok/djwt";
import { injectable } from "@needle-di/core";
import { ServerError } from "../../api/versions/v1/models/server-error.ts";
import { ENV_JWT_SECRET } from "../../api/versions/v1/constants/environment-constants.ts";
import { UrlUtils } from "../utils/url-utils.ts";

@injectable()
export class JWTService {
  private key: CryptoKey | null = null;

  public async getKey(): Promise<CryptoKey> {
    if (this.key !== null) {
      return this.key;
    }

    const secret: string | undefined = Deno.env.get(ENV_JWT_SECRET);

    this.key =
      secret === undefined
        ? await this.generateTemporaryKey()
        : await this.createKeyFromSecret(secret);

    return this.key;
  }

  private async generateTemporaryKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign", "verify"]
    );
  }

  private async createKeyFromSecret(secret: string): Promise<CryptoKey> {
    const secretBytes = new TextEncoder().encode(secret);

    return await crypto.subtle.importKey(
      "raw",
      secretBytes,
      {
        name: "HMAC",
        hash: "SHA-512",
      },
      false,
      ["sign", "verify"]
    );
  }

  public async verify(jwt: string): Promise<Payload> {
    const jwtKey = await this.getKey();

    let payload = null;

    try {
      payload = await verify(jwt, jwtKey);
    } catch (error) {
      console.error(error);
    }

    if (payload === null) {
      throw new ServerError("INVALID_TOKEN", "Invalid token", 401);
    }

    return payload;
  }

  public async createManagementToken(requestUrl: string) {
    const applicationBaseURL = UrlUtils.getApplicationBaseURL(requestUrl);

    return await create(
      { alg: "HS512", typ: "JWT" },
      {
        id: "00000000-0000-0000-0000-000000000000",
        name: "Management",
        // Wildcard audience claim to grant access to all resources
        aud: `${applicationBaseURL}/*`,
      },
      await this.getKey()
    );
  }

  public async createSetupToken(requestUrl: string) {
    const applicationBaseURL = UrlUtils.getApplicationBaseURL(requestUrl);
    const now = Math.floor(Date.now() / 1000);

    return await create(
      { alg: "HS512", typ: "JWT" },
      {
        id: "setup",
        name: "Setup",
        aud: `${applicationBaseURL}/*`,
        exp: now + 15 * 60, // 15 minutes
      },
      await this.getKey()
    );
  }

  public async createChallengeToken(challenge: string, displayName?: string) {
    const now = Math.floor(Date.now() / 1000);

    return await create(
      { alg: "HS512", typ: "JWT" },
      {
        challenge,
        displayName,
        exp: now + 2 * 60, // 2 minutes
      },
      await this.getKey()
    );
  }

  public async verifyChallengeToken(token: string): Promise<{ challenge: string; displayName?: string }> {
    const payload = await this.verify(token);

    if (typeof payload.challenge !== "string") {
      throw new ServerError("INVALID_TOKEN", "Token missing challenge", 400);
    }

    return { 
      challenge: payload.challenge,
      displayName: typeof payload.displayName === "string" ? payload.displayName : undefined
    };
  }
}
