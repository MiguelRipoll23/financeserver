import { create, Payload, verify } from "@wok/djwt";
import { CryptoUtils } from "../utils/crypto-utils.ts";
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
      true,
      ["sign", "verify"]
    );
  }

  private async createKeyFromSecret(secret: string): Promise<CryptoKey> {
    const encodedSecret = btoa(secret);

    return await CryptoUtils.base64ToCryptoKey(
      encodedSecret,
      {
        name: "HMAC",
        hash: "SHA-512",
      },
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

  public async createManagementToken() {
    const applicationBaseURL = UrlUtils.getApplicationBaseURL();

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
}
