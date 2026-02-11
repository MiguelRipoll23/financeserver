import {
  pgPolicy,
  pgTable,
  text,
  timestamp,
  jsonb,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { oauthClientsTable } from "./oauth-clients-table.ts";
import { authenticatedUserRole, isCurrentClient } from "../rls.ts";

export const oauthAuthorizationCodes = pgTable(
  "oauth_authorization_codes",
  {
    code: text().primaryKey().notNull(),
    codeHash: text("code_hash")
      .notNull()
      .unique(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClientsTable.clientId, { onDelete: "cascade" }),
    redirectUri: text("redirect_uri").notNull(),
    codeChallenge: text("code_challenge").notNull(),
    codeChallengeMethod: text("code_challenge_method").notNull(),
    scope: text().notNull(),
    accessTokenHash: text("access_token_hash").notNull(),
    tokenType: text("token_type").notNull(),
    user: jsonb().notNull(),
    resource: text(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "oauth_authorization_codes_code_challenge_method_valid",
      sql`code_challenge_method = 'S256'`
    ),
    pgPolicy("oauth_authorization_codes_select_own", {
      for: "select",
      to: authenticatedUserRole,
      using: isCurrentClient(table.clientId),
    }),
    pgPolicy("oauth_authorization_codes_delete_own", {
      for: "delete",
      to: authenticatedUserRole,
      using: isCurrentClient(table.clientId),
    }),
  ]
);
