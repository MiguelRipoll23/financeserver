CREATE TYPE "public"."bank_account_type" AS ENUM('checking', 'savings', 'credit_card', 'investment', 'loan', 'deposit', 'other');--> statement-breakpoint
CREATE TABLE "bank_account_interest_rate_calculations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bank_account_id" bigint NOT NULL,
	"monthly_profit_after_tax" numeric(15, 2) NOT NULL,
	"annual_profit_after_tax" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_account_roboadvisor_fund_calculations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bank_account_roboadvisor_id" bigint NOT NULL,
	"current_value_after_tax" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crypto_exchange_calculations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"crypto_exchange_id" bigint NOT NULL,
	"symbol_code" varchar(10) NOT NULL,
	"current_value_after_tax" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_account_interest_rates" ADD COLUMN "tax_percentage" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisor_funds" ADD COLUMN "share_count" numeric(20, 8);--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisors" ADD COLUMN "capital_gains_tax_percentage" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "crypto_exchanges" ADD COLUMN "capital_gains_tax_percentage" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "bank_account_interest_rate_calculations" ADD CONSTRAINT "bank_account_interest_rate_calculations_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisor_fund_calculations" ADD CONSTRAINT "bank_account_roboadvisor_fund_calculations_bank_account_roboadvisor_id_bank_account_roboadvisors_id_fk" FOREIGN KEY ("bank_account_roboadvisor_id") REFERENCES "public"."bank_account_roboadvisors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_exchange_calculations" ADD CONSTRAINT "crypto_exchange_calculations_crypto_exchange_id_crypto_exchanges_id_fk" FOREIGN KEY ("crypto_exchange_id") REFERENCES "public"."crypto_exchanges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_interest_rate_calcs_account_created" ON "bank_account_interest_rate_calculations" USING btree ("bank_account_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_roboadvisor_fund_calcs_roboadvisor_created" ON "bank_account_roboadvisor_fund_calculations" USING btree ("bank_account_roboadvisor_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_crypto_calcs_exchange_symbol_created" ON "crypto_exchange_calculations" USING btree ("crypto_exchange_id","symbol_code","created_at" DESC NULLS LAST);