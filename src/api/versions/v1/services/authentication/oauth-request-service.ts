import { inject, injectable } from "@needle-di/core";
import { KVService } from "../../../../../core/services/kv-service.ts";
import type { OAuthRequestData } from "../../interfaces/authentication/oauth-request-data-interface.ts";
import { ServerError } from "../../models/server-error.ts";
import type { OAuthAuthorizeQuery } from "../../schemas/oauth-schemas.ts";

@injectable()
export class OAuthRequestService {
  private readonly requestTtlMs = 10 * 60 * 1000; // 10 minutes

  constructor(
    private kvService = inject(KVService),
  ) {}

  public async createRequest(
    query: OAuthAuthorizeQuery,
  ): Promise<string> {
    const requestId = crypto.randomUUID();
    const now = Date.now();

    const requestData: OAuthRequestData = {
      requestId,
      clientId: query.client_id,
      redirectUri: query.redirect_uri,
      scope: query.scope || "",
      state: query.state,
      codeChallenge: query.code_challenge,
      codeChallengeMethod: query.code_challenge_method,
      resource: query.resource,
      status: "pending",
      createdAt: now,
      expiresAt: now + this.requestTtlMs,
    };

    await this.kvService.setOAuthRequest(
      requestId,
      requestData,
      this.requestTtlMs,
    );

    return requestId;
  }

  public async getRequest(requestId: string): Promise<OAuthRequestData> {
    const request = await this.kvService.getOAuthRequest(requestId);

    if (!request) {
      throw new ServerError(
        "OAUTH_REQUEST_NOT_FOUND",
        "OAuth request not found or expired",
        404,
      );
    }

    if (request.expiresAt < Date.now()) {
      throw new ServerError(
        "OAUTH_REQUEST_EXPIRED",
        "OAuth request has expired",
        410,
      );
    }

    return request;
  }

  public async approveRequest(requestId: string): Promise<OAuthRequestData> {
    const request = await this.getRequest(requestId);

    if (request.status !== "pending") {
      throw new ServerError(
        "OAUTH_REQUEST_ALREADY_PROCESSED",
        "OAuth request has already been processed",
        409,
      );
    }

    const updated = await this.kvService.updateOAuthRequestStatus(
      requestId,
      "approved",
    );

    if (!updated) {
      throw new ServerError(
        "OAUTH_REQUEST_UPDATE_FAILED",
        "Failed to update OAuth request status",
        500,
      );
    }

    return {
      ...request,
      status: "approved",
    };
  }

  public async denyRequest(requestId: string): Promise<OAuthRequestData> {
    const request = await this.getRequest(requestId);

    if (request.status !== "pending") {
      throw new ServerError(
        "OAUTH_REQUEST_ALREADY_PROCESSED",
        "OAuth request has already been processed",
        409,
      );
    }

    const updated = await this.kvService.updateOAuthRequestStatus(
      requestId,
      "denied",
    );

    if (!updated) {
      throw new ServerError(
        "OAUTH_REQUEST_UPDATE_FAILED",
        "Failed to update OAuth request status",
        500,
      );
    }

    return {
      ...request,
      status: "denied",
    };
  }
}
