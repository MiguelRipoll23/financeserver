CREATE TYPE "public"."balance_type" AS ENUM('deposit', 'withdrawal', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."bank_account_type" AS ENUM('checking', 'savings', 'credit_card', 'investment', 'loan', 'deposit', 'other');--> statement-breakpoint
CREATE TYPE "public"."fee_frequency" AS ENUM('monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."recurrence" AS ENUM('weekly', 'bi-weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE ROLE "authenticated_user" WITH CREATEROLE;--> statement-breakpoint
CREATE TABLE "bank_account_balances" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bank_account_id" bigint NOT NULL,
	"balance" numeric(15, 2) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_account_calculations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bank_account_id" bigint NOT NULL,
	"monthly_profit" numeric(15, 2) NOT NULL,
	"annual_profit" numeric(15, 2) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_account_interest_rates" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bank_account_id" bigint NOT NULL,
	"interest_rate" numeric(8, 6) NOT NULL,
	"interest_rate_start_date" date NOT NULL,
	"interest_rate_end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interest_rate_end_date_check" CHECK ("bank_account_interest_rates"."interest_rate_end_date" IS NULL OR "bank_account_interest_rates"."interest_rate_end_date" >= "bank_account_interest_rates"."interest_rate_start_date")
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "bank_account_type" DEFAULT 'checking' NOT NULL,
	"tax_percentage" numeric(8, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_category" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"hex_color" varchar(7),
	"favorited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_email" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bill_email_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bill_date" date NOT NULL,
	"category_id" bigint NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"email_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_balances" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"cash_id" bigint NOT NULL,
	"balance" numeric(15, 2) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crypto_exchange_balances" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"crypto_exchange_id" bigint NOT NULL,
	"balance" numeric(20, 8) NOT NULL,
	"symbol_code" varchar(10) NOT NULL,
	"invested_amount" numeric(15, 2),
	"invested_currency_code" varchar(3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crypto_exchange_calculations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"crypto_exchange_id" bigint NOT NULL,
	"symbol_code" varchar(10) NOT NULL,
	"current_value" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crypto_exchanges" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tax_percentage" numeric(8, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_prices" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_id" bigint NOT NULL,
	"price_date" date NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent_item_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_authorization_codes" (
	"code_hash" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"code_challenge" text NOT NULL,
	"code_challenge_method" text NOT NULL,
	"scope" text NOT NULL,
	"token_type" text NOT NULL,
	"user" jsonb NOT NULL,
	"resource" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_authorization_codes_code_challenge_method_valid" CHECK (code_challenge_method = 'S256')
);
--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_clients" (
	"client_id" text PRIMARY KEY NOT NULL,
	"redirect_uris" text[] NOT NULL,
	"client_id_issued_at" timestamp with time zone NOT NULL,
	"client_secret" text,
	"client_secret_expires_at" bigint,
	"grant_types" text[] NOT NULL,
	"response_types" text[] NOT NULL,
	"token_endpoint_auth_method" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_clients_redirect_uris_not_empty" CHECK (cardinality("oauth_clients"."redirect_uris") > 0),
	CONSTRAINT "oauth_clients_grant_types_supported" CHECK ("oauth_clients"."grant_types" <@ ARRAY['authorization_code', 'refresh_token']::text[]),
	CONSTRAINT "oauth_clients_grant_types_not_empty" CHECK (cardinality("oauth_clients"."grant_types") > 0),
	CONSTRAINT "oauth_clients_response_types_supported" CHECK ("oauth_clients"."response_types" <@ ARRAY['code']::text[]),
	CONSTRAINT "oauth_clients_response_types_not_empty" CHECK (cardinality("oauth_clients"."response_types") > 0),
	CONSTRAINT "oauth_clients_token_endpoint_auth_method_supported" CHECK ("oauth_clients"."token_endpoint_auth_method" IN ('none', 'client_secret_basic', 'client_secret_post'))
);
--> statement-breakpoint
ALTER TABLE "oauth_clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"access_token_hash" text NOT NULL,
	"client_id" text NOT NULL,
	"scope" text NOT NULL,
	"token_type" text NOT NULL,
	"user" jsonb NOT NULL,
	"resource" text,
	"expires_at" timestamp with time zone NOT NULL,
	"refresh_token_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_connections_refresh_token_hash_unique" UNIQUE("refresh_token_hash"),
	CONSTRAINT "oauth_connections_access_token_hash_unique" UNIQUE("access_token_hash"),
	CONSTRAINT "oauth_connections_token_type_valid" CHECK (token_type IN ('Bearer', 'bearer'))
);
--> statement-breakpoint
ALTER TABLE "oauth_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "passkeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" integer NOT NULL,
	"transports" text[],
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "receipt_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"receipt_id" bigint NOT NULL,
	"item_id" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"receipt_date" date NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"currency_code" varchar(3) DEFAULT 'USD' NOT NULL,
	"merchant_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roboadvisor_balances" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"roboadvisor_id" bigint NOT NULL,
	"date" date NOT NULL,
	"type" "balance_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roboadvisor_fund_calculations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"roboadvisor_id" bigint NOT NULL,
	"current_value" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roboadvisor_funds" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"roboadvisor_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"isin" varchar(12) NOT NULL,
	"asset_class" varchar(50) NOT NULL,
	"region" varchar(50) NOT NULL,
	"fund_currency_code" varchar(3) NOT NULL,
	"weight" numeric(8, 6) NOT NULL,
	"share_count" numeric(20, 8),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roboadvisors" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"bank_account_id" bigint NOT NULL,
	"risk_level" integer,
	"management_fee_percentage" numeric(8, 6) NOT NULL,
	"custody_fee_percentage" numeric(8, 6) NOT NULL,
	"fund_ter_percentage" numeric(8, 6) NOT NULL,
	"total_fee_percentage" numeric(8, 6) NOT NULL,
	"management_fee_frequency" "fee_frequency" NOT NULL,
	"custody_fee_frequency" "fee_frequency" NOT NULL,
	"ter_priced_in_nav" boolean DEFAULT true NOT NULL,
	"tax_percentage" numeric(8, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_changes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"recurrence" text NOT NULL,
	"net_amount" numeric(12, 2) NOT NULL,
	"currency_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_prices" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"subscription_id" bigint NOT NULL,
	"recurrence" "recurrence" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency_code" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_until" date,
	"plan" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_account_balances" ADD CONSTRAINT "bank_account_balances_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_account_calculations" ADD CONSTRAINT "bank_account_calculations_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_account_interest_rates" ADD CONSTRAINT "bank_account_interest_rates_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_category_id_bill_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."bill_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_email_id_bill_email_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."bill_email"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_balances" ADD CONSTRAINT "cash_balances_cash_id_cash_id_fk" FOREIGN KEY ("cash_id") REFERENCES "public"."cash"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_exchange_balances" ADD CONSTRAINT "crypto_exchange_balances_crypto_exchange_id_crypto_exchanges_id_fk" FOREIGN KEY ("crypto_exchange_id") REFERENCES "public"."crypto_exchanges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_exchange_calculations" ADD CONSTRAINT "crypto_exchange_calculations_crypto_exchange_id_crypto_exchanges_id_fk" FOREIGN KEY ("crypto_exchange_id") REFERENCES "public"."crypto_exchanges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_prices" ADD CONSTRAINT "item_prices_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_parent_item_id_items_id_fk" FOREIGN KEY ("parent_item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_client_id_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_client_id_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roboadvisor_balances" ADD CONSTRAINT "roboadvisor_balances_roboadvisor_id_roboadvisors_id_fk" FOREIGN KEY ("roboadvisor_id") REFERENCES "public"."roboadvisors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roboadvisor_fund_calculations" ADD CONSTRAINT "roboadvisor_fund_calculations_roboadvisor_id_roboadvisors_id_fk" FOREIGN KEY ("roboadvisor_id") REFERENCES "public"."roboadvisors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roboadvisor_funds" ADD CONSTRAINT "roboadvisor_funds_roboadvisor_id_roboadvisors_id_fk" FOREIGN KEY ("roboadvisor_id") REFERENCES "public"."roboadvisors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roboadvisors" ADD CONSTRAINT "roboadvisors_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_prices" ADD CONSTRAINT "subscription_prices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bank_account_balances_account_created" ON "bank_account_balances" USING btree ("bank_account_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_bank_account_balances_created" ON "bank_account_balances" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_bank_account_calculations_account_created" ON "bank_account_calculations" USING btree ("bank_account_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_interest_rates_account_created" ON "bank_account_interest_rates" USING btree ("bank_account_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "bank_accounts_name_idx" ON "bank_accounts" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "bill_category_normalized_name_key" ON "bill_category" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "bill_category_name_idx" ON "bill_category" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "bills_bill_date_unique" ON "bills" USING btree ("bill_date");--> statement-breakpoint
CREATE INDEX "bills_category_id_idx" ON "bills" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "bills_total_amount_idx" ON "bills" USING btree ("total_amount");--> statement-breakpoint
CREATE INDEX "idx_bills_date_category" ON "bills" USING btree ("bill_date" DESC NULLS LAST,"category_id");--> statement-breakpoint
CREATE INDEX "idx_cash_balances_cash_created" ON "cash_balances" USING btree ("cash_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_cash_balances_created" ON "cash_balances" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "cash_label_idx" ON "cash" USING btree ("label");--> statement-breakpoint
CREATE INDEX "idx_crypto_balances_exchange_created" ON "crypto_exchange_balances" USING btree ("crypto_exchange_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_crypto_balances_created" ON "crypto_exchange_balances" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_crypto_calcs_exchange_symbol_created" ON "crypto_exchange_calculations" USING btree ("crypto_exchange_id","symbol_code","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "crypto_exchanges_name_unique" ON "crypto_exchanges" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "item_prices_item_id_price_date_key" ON "item_prices" USING btree ("item_id","price_date");--> statement-breakpoint
CREATE INDEX "item_prices_unit_price_idx" ON "item_prices" USING btree ("unit_price");--> statement-breakpoint
CREATE INDEX "item_prices_price_date_idx" ON "item_prices" USING btree ("price_date");--> statement-breakpoint
CREATE INDEX "item_prices_item_id_price_date_desc_idx" ON "item_prices" USING btree ("item_id","price_date" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "items_root_name_key" ON "items" USING btree ("name") WHERE "items"."parent_item_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "items_name_parent_item_id_key" ON "items" USING btree ("name","parent_item_id") WHERE "items"."parent_item_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "items_parent_item_id_idx" ON "items" USING btree ("parent_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_name_unique" ON "merchants" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "passkeys_credential_id_unique" ON "passkeys" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "receipt_items_receipt_id_idx" ON "receipt_items" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "receipt_items_item_id_idx" ON "receipt_items" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_receipts_date" ON "receipts" USING btree ("receipt_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "receipts_total_amount_idx" ON "receipts" USING btree ("total_amount");--> statement-breakpoint
CREATE INDEX "receipts_merchant_id_idx" ON "receipts" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "idx_roboadvisor_fund_calcs_roboadvisor_created" ON "roboadvisor_fund_calculations" USING btree ("roboadvisor_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_salary_changes_created" ON "salary_changes" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "subscription_prices_subscription_id_idx" ON "subscription_prices" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_prices_recurrence_idx" ON "subscription_prices" USING btree ("recurrence");--> statement-breakpoint
CREATE INDEX "subscription_prices_amount_idx" ON "subscription_prices" USING btree ("amount");--> statement-breakpoint
CREATE INDEX "subscription_prices_currency_code_idx" ON "subscription_prices" USING btree ("currency_code");--> statement-breakpoint
CREATE INDEX "subscription_prices_effective_from_idx" ON "subscription_prices" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "subscription_prices_effective_until_idx" ON "subscription_prices" USING btree ("effective_until");--> statement-breakpoint
CREATE INDEX "subscription_prices_subscription_id_effective_from_desc_idx" ON "subscription_prices" USING btree ("subscription_id","effective_from" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "subscription_prices_effective_dates_idx" ON "subscription_prices" USING btree ("effective_from","effective_until");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_is_active" ON "subscriptions" USING btree ("is_active");--> statement-breakpoint
CREATE POLICY "oauth_authorization_codes_select_own" ON "oauth_authorization_codes" AS PERMISSIVE FOR SELECT TO "authenticated_user" USING ((current_setting('app.client_id', true)::text = "oauth_authorization_codes"."client_id"));--> statement-breakpoint
CREATE POLICY "oauth_authorization_codes_delete_own" ON "oauth_authorization_codes" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING ((current_setting('app.client_id', true)::text = "oauth_authorization_codes"."client_id"));--> statement-breakpoint
CREATE POLICY "oauth_clients_select_own" ON "oauth_clients" AS PERMISSIVE FOR SELECT TO "authenticated_user" USING ((current_setting('app.client_id', true)::text = "oauth_clients"."client_id"));--> statement-breakpoint
CREATE POLICY "oauth_clients_update_own" ON "oauth_clients" AS PERMISSIVE FOR UPDATE TO "authenticated_user" USING ((current_setting('app.client_id', true)::text = "oauth_clients"."client_id")) WITH CHECK ((current_setting('app.client_id', true)::text = "oauth_clients"."client_id"));--> statement-breakpoint
CREATE POLICY "oauth_connections_select_own" ON "oauth_connections" AS PERMISSIVE FOR SELECT TO "authenticated_user" USING ((current_setting('app.client_id', true)::text = "oauth_connections"."client_id"));--> statement-breakpoint
CREATE POLICY "oauth_connections_update_own" ON "oauth_connections" AS PERMISSIVE FOR UPDATE TO "authenticated_user" USING ((current_setting('app.client_id', true)::text = "oauth_connections"."client_id")) WITH CHECK ((current_setting('app.client_id', true)::text = "oauth_connections"."client_id"));--> statement-breakpoint
CREATE POLICY "oauth_connections_delete_own" ON "oauth_connections" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING ((current_setting('app.client_id', true)::text = "oauth_connections"."client_id"));