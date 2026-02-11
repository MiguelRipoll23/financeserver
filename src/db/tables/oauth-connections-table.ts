import {
  pgPolicy,
  pgTable,
  text,
  timestamp,
  jsonb,
  check,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { oauthClientsTable } from "./oauth-clients-table.ts";
import { authenticatedUserRole, isCurrentClient } from "../rls.ts";

export const oauthConnections = pgTable(
  "oauth_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    refreshTokenHash: text("refresh_token_hash")
      .notNull()
      .unique(),
    accessTokenHash: text("access_token_hash")
      .notNull()
      .unique(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClientsTable.clientId, { onDelete: "cascade" }),
    scope: text().notNull(),
    tokenType: text("token_type").notNull(),
    user: jsonb().notNull(),
    resource: text(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
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
      "oauth_connections_token_type_valid",
      sql`token_type IN ('Bearer', 'bearer')`
    ),
    pgPolicy("oauth_connections_select_own", {
      for: "select",
      to: authenticatedUserRole,
      using: isCurrentClient(table.clientId),
    }),
    pgPolicy("oauth_connections_update_own", {
      for: "update",
      to: authenticatedUserRole,
      using: isCurrentClient(table.clientId),
      withCheck: isCurrentClient(table.clientId),
    }),
    pgPolicy("oauth_connections_delete_own", {
      for: "delete",
      to: authenticatedUserRole,
      using: isCurrentClient(table.clientId),
    }),
  ]
);
