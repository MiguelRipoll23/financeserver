import { inject, injectable } from "@needle-di/core";
import { eq } from "drizzle-orm";
import { ServerError } from "../../models/server-error.ts";
import type { RegisteredOAuthClient } from "../../interfaces/authentication/registered-oauth-client-interface.ts";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  type OAuthClientEntity,
  type OAuthClientInsertEntity,
  oauthClientsTable,
} from "../../../../../db/tables/oauth-clients-table.ts";
import {
  OAuthClientRegistrationRequest,
  OAuthClientRegistrationResponse,
} from "../../schemas/oauth-schemas.ts";

@injectable()
export class OAuthClientRegistryService {
  constructor(private databaseService = inject(DatabaseService)) {}

  /** Register a new public OAuth client */
  public async registerPublicClient(
    request: OAuthClientRegistrationRequest,
  ): Promise<OAuthClientRegistrationResponse> {
    // All request-level validation is handled by Zod schemas, so we skip manual checks

    const clientId = crypto.randomUUID().replaceAll("-", "");
    const now = new Date();

    const entity: OAuthClientInsertEntity = {
      clientId,
      redirectUris: request.redirect_uris,
      clientIdIssuedAt: now,
      grantTypes: ["authorization_code"],
      responseTypes: ["code"],
      tokenEndpointAuthMethod: "none",
      createdAt: now,
      updatedAt: now,
    };

    const created = await this.insertClient(entity);
    return this.mapToRegistrationResponse(created);
  }

  /** Check if a client is already registered */
  public async isClientRegistered(clientId: string): Promise<boolean> {
    const [record] = await this.databaseService.executeWithRlsClient(
      clientId,
      async (tx) => {
        return await tx
          .select({ clientId: oauthClientsTable.clientId })
          .from(oauthClientsTable)
          .where(eq(oauthClientsTable.clientId, clientId))
          .limit(1);
      },
    );

    return Boolean(record);
  }

  /** Retrieve a registered OAuth client by clientId */
  public async getClient(
    clientId: string,
  ): Promise<RegisteredOAuthClient | null> {
    const [record] = await this.databaseService.executeWithRlsClient(
      clientId,
      async (tx) => {
        return await tx
          .select({
            clientId: oauthClientsTable.clientId,
            redirectUris: oauthClientsTable.redirectUris,
            clientIdIssuedAt: oauthClientsTable.clientIdIssuedAt,
            clientSecret: oauthClientsTable.clientSecret,
            clientSecretExpiresAt: oauthClientsTable.clientSecretExpiresAt,
            grantTypes: oauthClientsTable.grantTypes,
            responseTypes: oauthClientsTable.responseTypes,
            tokenEndpointAuthMethod: oauthClientsTable.tokenEndpointAuthMethod,
            createdAt: oauthClientsTable.createdAt,
            updatedAt: oauthClientsTable.updatedAt,
          })
          .from(oauthClientsTable)
          .where(eq(oauthClientsTable.clientId, clientId))
          .limit(1);
      },
    );

    return record ? this.mapEntityToRegisteredClient(record) : null;
  }

  /** Insert a new OAuth client into the database */
  private async insertClient(
    entity: OAuthClientInsertEntity,
  ): Promise<OAuthClientEntity> {
    const [created] = await this.databaseService.executeWithRlsClient(
      entity.clientId,
      async (tx) => {
        return await tx.insert(oauthClientsTable).values(entity).returning({
          clientId: oauthClientsTable.clientId,
          redirectUris: oauthClientsTable.redirectUris,
          clientIdIssuedAt: oauthClientsTable.clientIdIssuedAt,
          clientSecret: oauthClientsTable.clientSecret,
          clientSecretExpiresAt: oauthClientsTable.clientSecretExpiresAt,
          grantTypes: oauthClientsTable.grantTypes,
          responseTypes: oauthClientsTable.responseTypes,
          tokenEndpointAuthMethod: oauthClientsTable.tokenEndpointAuthMethod,
          createdAt: oauthClientsTable.createdAt,
          updatedAt: oauthClientsTable.updatedAt,
        });
      },
    );

    if (!created) {
      console.error("Failed to register OAuth client", {
        clientId: entity.clientId,
      });
      throw new ServerError(
        "OAUTH_CLIENT_REGISTRATION_FAILED",
        "Failed to persist OAuth client registration",
        500,
      );
    }

    return created;
  }

  /** Map a persisted OAuth client entity to the registration response */
  private mapToRegistrationResponse(
    created: OAuthClientEntity,
  ): OAuthClientRegistrationResponse {
    return {
      client_id: created.clientId,
      client_id_issued_at: Math.floor(
        created.clientIdIssuedAt.getTime() / 1000,
      ),
      client_secret: created.clientSecret ?? undefined,
      client_secret_expires_at: created.clientSecretExpiresAt ?? undefined,
      redirect_uris: created.redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
    };
  }

  /** Map a DB entity to a registered client object */
  private mapEntityToRegisteredClient(
    entity: OAuthClientEntity,
  ): RegisteredOAuthClient {
    // Minimal DB validation for safety
    if (!entity.redirectUris?.length) {
      throw new ServerError(
        "INVALID_OAUTH_CLIENT",
        "OAuth client does not have redirect URIs configured",
        500,
      );
    }

    return {
      clientId: entity.clientId,
      redirectUris: entity.redirectUris,
      clientIdIssuedAt: this.toEpochSeconds(entity.clientIdIssuedAt),
      clientSecret: entity.clientSecret ?? null,
      clientSecretExpiresAt: entity.clientSecretExpiresAt ?? null,
      grantTypes: ["authorization_code"],
      responseTypes: ["code"],
      tokenEndpointAuthMethod: "none",
    } satisfies RegisteredOAuthClient;
  }

  /** Convert a date or number to epoch seconds */
  private toEpochSeconds(value: Date | string | number): number {
    if (typeof value === "number") return Math.floor(value);
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new ServerError(
        "INVALID_OAUTH_CLIENT",
        "OAuth client has an invalid issued at timestamp",
        500,
      );
    }
    return Math.floor(date.getTime() / 1000);
  }
}
