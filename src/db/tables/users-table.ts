import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    githubHandle: text("github_handle").notNull(),
    githubHandleNormalized: text("github_handle_normalized").notNull(),
    displayName: text("display_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("users_github_handle_normalized_unique").on(
      table.githubHandleNormalized
    ),
  ]
);

export type UserEntity = typeof usersTable.$inferSelect;
export type UserInsertEntity = typeof usersTable.$inferInsert;
