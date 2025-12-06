import { pgTable, bigserial, date, numeric, timestamp, foreignKey, bigint, integer, unique, text, check, uniqueIndex, uuid, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const receipts = pgTable("receipts", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	receiptDate: date("receipt_date").notNull(),
	totalAmount: numeric("total_amount", { precision: 12, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const receiptItems = pgTable("receipt_items", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	receiptId: bigint("receipt_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	itemId: bigint("item_id", { mode: "number" }).notNull(),
	quantity: integer().notNull(),
	totalAmount: numeric("total_amount", { precision: 12, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.receiptId],
			foreignColumns: [receipts.id],
			name: "receipt_items_receipt_id_receipts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "receipt_items_item_id_items_id_fk"
		}).onDelete("cascade"),
]);

export const billEmail = pgTable("bill_email", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	email: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("bill_email_email_unique").on(table.email),
]);

export const oauthClients = pgTable("oauth_clients", {
	clientId: text("client_id").primaryKey().notNull(),
	redirectUris: text("redirect_uris").array().notNull(),
	clientIdIssuedAt: timestamp("client_id_issued_at", { withTimezone: true, mode: 'string' }).notNull(),
	clientSecret: text("client_secret"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clientSecretExpiresAt: bigint("client_secret_expires_at", { mode: "number" }),
	grantTypes: text("grant_types").array().notNull(),
	responseTypes: text("response_types").array().notNull(),
	tokenEndpointAuthMethod: text("token_endpoint_auth_method").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, () => [
	check("oauth_clients_grant_types_supported", sql`grant_types <@ ARRAY['authorization_code'::text, 'refresh_token'::text]`),
	check("oauth_clients_grant_types_not_empty", sql`cardinality(grant_types) > 0`),
	check("oauth_clients_response_types_supported", sql`response_types <@ ARRAY['code'::text]`),
	check("oauth_clients_response_types_not_empty", sql`cardinality(response_types) > 0`),
	check("oauth_clients_token_endpoint_auth_method_supported", sql`token_endpoint_auth_method = ANY (ARRAY['none'::text, 'client_secret_basic'::text, 'client_secret_post'::text])`),
	check("oauth_clients_redirect_uris_not_empty", sql`cardinality(redirect_uris) > 0`),
]);

export const users = pgTable("users", {
	id: uuid().primaryKey().notNull(),
	githubHandle: text("github_handle").notNull(),
	githubHandleNormalized: text("github_handle_normalized").notNull(),
	displayName: text("display_name"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("users_github_handle_normalized_unique").using("btree", table.githubHandleNormalized.asc().nullsLast().op("text_ops")),
]);

export const billCategory = pgTable("bill_category", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	name: text().notNull(),
	normalizedName: text("normalized_name").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("bill_category_normalized_name_key").using("btree", table.normalizedName.asc().nullsLast().op("text_ops")),
]);

export const bills = pgTable("bills", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	billDate: date("bill_date").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	categoryId: bigint("category_id", { mode: "number" }).notNull(),
	totalAmount: numeric("total_amount", { precision: 12, scale:  2 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	emailId: bigint("email_id", { mode: "number" }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("bills_bill_date_unique").using("btree", table.billDate.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [billCategory.id],
			name: "bills_category_id_bill_category_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.emailId],
			foreignColumns: [billEmail.id],
			name: "bills_email_id_bill_email_id_fk"
		}).onDelete("set null"),
]);

export const items = pgTable("items", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("items_name_key").using("btree", table.name.asc().nullsLast().op("text_ops")),
]);

export const itemPrices = pgTable("item_prices", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	itemId: bigint("item_id", { mode: "number" }).notNull(),
	priceDate: date("price_date").notNull(),
	unitPrice: numeric("unit_price", { precision: 12, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("item_prices_item_id_price_date_key").using("btree", table.itemId.asc().nullsLast().op("date_ops"), table.priceDate.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "item_prices_item_id_items_id_fk"
		}).onDelete("cascade"),
]);

export const oauthAuthorizationCodes = pgTable("oauth_authorization_codes", {
	code: text().primaryKey().notNull(),
	clientId: text("client_id").notNull(),
	redirectUri: text("redirect_uri").notNull(),
	codeChallenge: text("code_challenge").notNull(),
	codeChallengeMethod: text("code_challenge_method").notNull(),
	scope: text().notNull(),
	accessToken: text("access_token").notNull(),
	tokenType: text("token_type").notNull(),
	user: jsonb().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, () => [
	check("oauth_authorization_codes_code_challenge_method_valid", sql`code_challenge_method = 'S256'::text`),
]);
