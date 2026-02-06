import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  integer,
} from "drizzle-orm/pg-core";

export const passkeysTable = pgTable(
  "passkeys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    credentialId: text("credential_id").notNull(),
    publicKey: text("public_key").notNull(),
    counter: integer("counter").notNull(),
    transports: text("transports").array(),
    displayName: text("display_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("passkeys_credential_id_unique").on(table.credentialId),
  ]
);

export type PasskeyEntity = typeof passkeysTable.$inferSelect;
export type PasskeyInsertEntity = typeof passkeysTable.$inferInsert;
