CREATE TYPE "public"."balance_type" AS ENUM('deposit', 'withdrawal', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."fee_frequency" AS ENUM('monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TABLE "bank_account_roboadvisor_balances" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bank_account_roboadvisor_id" bigint NOT NULL,
	"date" date NOT NULL,
	"type" "balance_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_account_roboadvisor_funds" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bank_account_roboadvisor_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"isin" varchar(12) NOT NULL,
	"asset_class" varchar(50) NOT NULL,
	"region" varchar(50) NOT NULL,
	"fund_currency_code" varchar(3) NOT NULL,
	"weight" numeric(6, 5) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_account_roboadvisors" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"bank_account_id" bigint NOT NULL,
	"risk_level" integer,
	"management_fee_pct" numeric(6, 5) NOT NULL,
	"custody_fee_pct" numeric(6, 5) NOT NULL,
	"fund_ter_pct" numeric(6, 5) NOT NULL,
	"total_fee_pct" numeric(6, 5) NOT NULL,
	"management_fee_frequency" "fee_frequency" NOT NULL,
	"custody_fee_frequency" "fee_frequency" NOT NULL,
	"ter_priced_in_nav" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "bank_account_balances_bank_account_id_idx";--> statement-breakpoint
DROP INDEX "bank_account_balances_created_at_idx";--> statement-breakpoint
DROP INDEX "bank_account_interest_rates_bank_account_id_idx";--> statement-breakpoint
DROP INDEX "bank_account_interest_rates_created_at_idx";--> statement-breakpoint
DROP INDEX "bank_account_interest_rates_period_idx";--> statement-breakpoint
DROP INDEX "bills_bill_date_category_id_idx";--> statement-breakpoint
DROP INDEX "cash_balances_cash_id_idx";--> statement-breakpoint
DROP INDEX "cash_balances_created_at_idx";--> statement-breakpoint
DROP INDEX "crypto_exchange_balances_crypto_exchange_id_idx";--> statement-breakpoint
DROP INDEX "crypto_exchange_balances_symbol_code_idx";--> statement-breakpoint
DROP INDEX "receipts_receipt_date_idx";--> statement-breakpoint
ALTER TABLE "bill_category" ADD COLUMN "hex_color" varchar(7);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisor_balances" ADD CONSTRAINT "bank_account_roboadvisor_balances_bank_account_roboadvisor_id_bank_account_roboadvisors_id_fk" FOREIGN KEY ("bank_account_roboadvisor_id") REFERENCES "public"."bank_account_roboadvisors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisor_funds" ADD CONSTRAINT "bank_account_roboadvisor_funds_bank_account_roboadvisor_id_bank_account_roboadvisors_id_fk" FOREIGN KEY ("bank_account_roboadvisor_id") REFERENCES "public"."bank_account_roboadvisors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisors" ADD CONSTRAINT "bank_account_roboadvisors_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bank_account_balances_account_created" ON "bank_account_balances" USING btree ("bank_account_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_bank_account_balances_created" ON "bank_account_balances" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_interest_rates_account_created" ON "bank_account_interest_rates" USING btree ("bank_account_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "bill_category_name_idx" ON "bill_category" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_bills_date_category" ON "bills" USING btree ("bill_date" DESC NULLS LAST,"category_id");--> statement-breakpoint
CREATE INDEX "idx_cash_balances_cash_created" ON "cash_balances" USING btree ("cash_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_cash_balances_created" ON "cash_balances" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_crypto_balances_exchange_created" ON "crypto_exchange_balances" USING btree ("crypto_exchange_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_crypto_balances_created" ON "crypto_exchange_balances" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_receipts_date" ON "receipts" USING btree ("receipt_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_salary_changes_created" ON "salary_changes" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_subscriptions_is_active" ON "subscriptions" USING btree ("is_active");