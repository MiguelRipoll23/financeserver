import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  pgPolicy,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { authenticatedUserRole, isCurrentClient } from "../rls.ts";

export const oauthClientsTable = pgTable(
  "oauth_clients",
  {
    clientId: text("client_id").primaryKey(),
    redirectUris: text("redirect_uris").array().notNull(),
    clientIdIssuedAt: timestamp("client_id_issued_at", {
      withTimezone: true,
    }).notNull(),
    clientSecret: text("client_secret"),
    clientSecretExpiresAt: bigint("client_secret_expires_at", {
      mode: "number",
    }),
    grantTypes: text("grant_types").array().notNull(),
    responseTypes: text("response_types").array().notNull(),
    tokenEndpointAuthMethod: text("token_endpoint_auth_method").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "oauth_clients_redirect_uris_not_empty",
      sql`cardinality(${table.redirectUris}) > 0`,
    ),
    check(
      "oauth_clients_grant_types_supported",
      sql`${table.grantTypes} <@ ARRAY['authorization_code', 'refresh_token']::text[]`,
    ),
    check(
      "oauth_clients_grant_types_not_empty",
      sql`cardinality(${table.grantTypes}) > 0`,
    ),
    check(
      "oauth_clients_response_types_supported",
      sql`${table.responseTypes} <@ ARRAY['code']::text[]`,
    ),
    check(
      "oauth_clients_response_types_not_empty",
      sql`cardinality(${table.responseTypes}) > 0`,
    ),
    check(
      "oauth_clients_token_endpoint_auth_method_supported",
      sql`${table.tokenEndpointAuthMethod} IN ('none', 'client_secret_basic', 'client_secret_post')`,
    ),
    pgPolicy("oauth_clients_select_own", {
      for: "select",
      to: authenticatedUserRole,
      using: isCurrentClient(table.clientId),
    }),
    pgPolicy("oauth_clients_update_own", {
      for: "update",
      to: authenticatedUserRole,
      using: isCurrentClient(table.clientId),
      withCheck: isCurrentClient(table.clientId),
    }),
  ],
);

export type OAuthClientEntity = typeof oauthClientsTable.$inferSelect;
export type OAuthClientInsertEntity = typeof oauthClientsTable.$inferInsert;
