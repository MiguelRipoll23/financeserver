import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

// Define role name constant for Row Level Security
// Note: The role is created in migration 0000_friendly_night_nurse.sql
// We use a string reference instead of pgRole to avoid recreation attempts
export const authenticatedUserRole = "authenticated_user";

// Helper function to check if current user ID matches a client ID column
export const isCurrentClient = (clientIdColumn: AnyPgColumn) =>
  sql`(current_setting('app.client_id', true)::string = ${clientIdColumn})`;
