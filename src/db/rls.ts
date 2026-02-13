import { sql } from "drizzle-orm";
import { pgRole } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

// Define the authenticated_user role for Row Level Security
export const authenticatedUserRole = pgRole("authenticated_user", {
  createRole: true,
});

// Helper function to check if current user ID matches a client ID column
export const isCurrentClient = (clientIdColumn: AnyPgColumn) =>
  sql`(current_setting('app.client_id', true)::string = ${clientIdColumn})`;
