import {
  pgTable,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const passkeysTable = pgTable(
  "passkeys",
  {
    id: text("id").primaryKey(),
    publicKey: text("public_key").notNull(),
    counter: integer("counter").notNull(),
    transports: text("transports").array(),
    displayName: text("display_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
);

export type PasskeyEntity = typeof passkeysTable.$inferSelect;
export type PasskeyInsertEntity = typeof passkeysTable.$inferInsert;
